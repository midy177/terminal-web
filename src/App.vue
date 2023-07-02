<script setup lang="ts" name="app">
import Terminal from "./components/terminal/Terminal.vue";
import Monaco from "./components/monaco/Monaco.vue";
import {reactive} from "vue";
const state = reactive({
    data: ''
})
</script>

<template>
  <Terminal url="ws://127.0.0.1:8080/web_terminal" :withTrzsz="true"/>
<!--  <monaco v-model="state.data" :canChangeMode="true" height="100%" language="sql"/>-->
</template>

<!--<style scoped></style>-->
