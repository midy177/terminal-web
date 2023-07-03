<template>
 <div class="main-xterm">
     <div id="xterm" class="xterm" @dragover="handlerDragover" @drop="handlerDrop">
         <select class="change-theme" v-if="canChangeTheme" v-model="state.currTheme" @change="handlerChangeTheme">
             <option v-for="(item,i) in state.allThemes" :key="i" :label="i" :value="item"/>
         </select>
     </div>
 </div>
</template>

<script lang="ts" setup name="terminal">
import 'xterm/css/xterm.css';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { TrzszFilter } from 'trzsz';
import { Unicode11Addon } from 'xterm-addon-unicode11';
import { Gruvbox_Dark } from 'xterm-theme';
import xtermTheme from 'xterm-theme';
import {nextTick, reactive, onMounted, onBeforeUnmount} from 'vue';


const props = defineProps({
  url: {
    type: String,
    required: true
    },
  withTrzsz: {
    type: Boolean,
    default: false,
    required: true
  },
  canChangeTheme: {
    type: Boolean,
    default: false,
    required: true
  }
})

const state = reactive({
    term: null as any,
    socket: null as any,
    trzszFilter: null as any,
    allThemes: xtermTheme,
    currTheme: Gruvbox_Dark,
});

const fitAddon = new FitAddon();
const unicode11Addon = new Unicode11Addon();

onMounted(() => {
    nextTick(() => {
      if (props.withTrzsz) initTrzszFilter();
      initXterm();
      initSocket();
    });
});

onBeforeUnmount(() => {
    if (state.socket) {
        state.socket.close();
        console.log('socket关闭');
    }
    if (state.term) {
        state.term.dispose();
        state.term = null;
    }
});

function initXterm() {
    const term: any = new Terminal({
      fontSize: 15,
      fontWeight: 'normal',
      fontFamily: 'JetBrainsMono, monaco, Consolas, Lucida Console, monospace',
      cursorBlink: true,
      disableStdin: false,
      cursorStyle: 'underline',
      allowProposedApi: true,
      theme: Gruvbox_Dark,
    });
    term.open(document.getElementById('xterm'));
    term.loadAddon(fitAddon);
    term.loadAddon(unicode11Addon);
    term.unicode.activeVersion = '11';
    fitAddon.fit();
    term.focus();
    state.term = term;
    term.onData((data: any) => {
      props.withTrzsz && state.trzszFilter ? state.trzszFilter.processTerminalInput(data) : sendToSocket(data);
    });
    term.onBinary((data: any) => {
      props.withTrzsz && state.trzszFilter ? state.trzszFilter.processBinaryInput(data) : sendToSocket(data);
    });
    term.onResize(size => {
        onResize(size)
    })
}

function initSocket() {
    state.socket = new WebSocket(props.url || '');
    // 监听socket连接
    state.socket.onopen = () => {
      addTerminalResize();
    };
    // 监听socket错误信息
    state.socket.onerror = (e: any) => {
        console.error('连接错误', e);
      writeToTerminal(`\r\n\x1b[31m============== Error: ${JSON.stringify(e)} ============\x1b[0m\r\n`);
    };
    state.socket.onclose = () => {
        if (state.term) {
            // state.term.writeln('\r\n\x1b[31m提示: 连接已关闭...');
          writeToTerminal(`\r\n\x1b[31m============== connect closed! ============\x1b[0m\r\n`);
        }
      removeResizeListener();
    };
    // 发送socket消息
    // state.socket.onsend = sendToSocket;
    // 监听socket消息
    state.socket.onmessage = getMessageFromWebsocket;
}

function initTrzszFilter(){
  state.trzszFilter = new TrzszFilter({
    writeToTerminal: (data) => writeToTerminal(data),
    sendToServer: (data) => sendToSocket(data),
  });
}

function getMessageFromWebsocket(msg: any) {
  const data = msg.data;
  if (data instanceof Blob) {
    const reader = new FileReader();
    reader.onload = function(event: ProgressEvent<FileReader>) {
      if (event.target && event.target.result) {
        const result: string = event.target.result as string;
        props.withTrzsz && state.trzszFilter? state.trzszFilter.processServerOutput(result) : state.term.write(result);
      }
    };
    reader.readAsText(data);
  }
}

function sendToSocket(msg: any) {
  // console.log('send from trzsz\n',msg)
  state.socket.send(typeof msg === "string" ? new TextEncoder().encode(msg) : msg);
}

function writeToTerminal(msg: any) {
  // console.log('write from trzsz\n',msg)
  state.term.write(typeof msg === "string" ? msg : new Uint8Array(msg));
}

function onResize(size: any) {
    try {
      if (state.term) {
        state.term.focus();
        if (state.socket) state.socket.send(JSON.stringify(size));
        if (props.withTrzsz && state.trzszFilter) state.trzszFilter.setTerminalColumns(size.cols);
      }
    } catch (e) {
      console.error(e);
      writeToTerminal(`\r\n\r\n\x1b[31m============== Error: ${JSON.stringify(e)} ============\x1b[0m\r\n\r\n`);
    }
}
function fitTerm() {
    setTimeout(() => {
        fitAddon.fit();
    }, 100)
}

function addTerminalResize() {
  window.addEventListener("resize", fitTerm);
  onResize({cols: state.term.cols, rows: state.term.rows});
}
function removeResizeListener() {
  window.removeEventListener("resize", fitTerm);
}

function handlerDragover(event: any) {
  event.preventDefault();
}

function handlerDrop(event: any){
  event.preventDefault();
  if (props.withTrzsz && state.trzszFilter) state.trzszFilter.uploadFiles(event.dataTransfer.items)
      .then(() => console.log("upload success"))
      .catch((err) => console.error(err));
}

function handlerChangeTheme(event: any) {
    if (state.term) state.term.options.theme = state.currTheme
}
</script>
<style scoped>
.main-xterm {
    position: relative;
    height: 100%;
    width: 100%;
}
.xterm {
    position: absolute;
  width: 100%;
  height: 100%;
  text-align: left;
    .xterm-viewport {
        overflow-y: hidden;
    }
}
.change-theme {
    position: absolute;
    top: 0.25rem;
    right: 1rem;
    z-index: 900;
}
</style>
