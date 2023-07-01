<template>
    <div id="xterm" class="xterm" />
</template>

<script lang="ts" setup name="terminal">
import 'xterm/css/xterm.css';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { nextTick, reactive, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
    url: { type: String },
})

const state = reactive({
    term: null as any,
    socket: null as any,
});

const fitAddon = new FitAddon();

const resize = 1;
const data = 2;

onMounted(() => {

    nextTick(() => {
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
        theme: {
            foreground: '#ffffff', //字体
            background: '#000000', //背景色
            cursor: '#90f64c', //设置光标
            cursorAccent: "red",  // 光标停止颜色
        } as any,
    });
    term.loadAddon(fitAddon);
    term.open(document.getElementById('xterm'));
    fitAddon.fit();
    term.focus();
    state.term = term;
    term.onData((key: any) => {
      send(key);
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
        console.log('连接错误', e);
    };
    state.socket.onclose = () => {
        if (state.term) {
            state.term.writeln('\r\n\x1b[31m提示: 连接已关闭...');
        }
      removeResizeListener();
    };
    // 发送socket消息
    state.socket.onsend = send;
    // 监听socket消息
    state.socket.onmessage = getMessage;
}

function getMessage(msg: any) {
  const data = msg.data;
  if (data instanceof Blob) {
    const reader = new FileReader();
    reader.onload = function(event: ProgressEvent<FileReader>) {
      if (event.target && event.target.result) {
        const result: string = event.target.result as string;
        state.term.write(result);
      }
    };
    reader.readAsText(data);
  }
}

function send(msg: any) {
    state.socket.send(new TextEncoder().encode(msg));
}

function onResize(size: any) {
    try {
      if (state.term) {
        state.term.focus();
        if (state.socket) {
          state.socket.send(JSON.stringify(size));
        }
      }
    } catch (e) {
      console.error(e);
    }
}
function fitTerm() {
    setTimeout(() => {
        fitAddon.fit();
    }, 100)
};
function addTerminalResize() {
  window.addEventListener("resize", fitTerm);
  onResize({cols: state.term.cols, rows: state.term.rows});
}
function removeResizeListener() {
  window.removeEventListener("resize", fitTerm);
}
</script>
<style scoped>
.xterm {
  width: 100%;
  height: 100%;
  text-align: left;
    .xterm-viewport {
        overflow-y: hidden;
    }
}
</style>
