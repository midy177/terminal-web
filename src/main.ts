import { createApp } from 'vue'
import './style.css'
import { DatePicker } from "ant-design-vue";
// @ts-ignore
import App from "./App.vue"
createApp(App)
const app = createApp(App)
app.use(DatePicker).mount('#app')