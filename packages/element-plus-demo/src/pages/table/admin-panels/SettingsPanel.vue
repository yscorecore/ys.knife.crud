<!-- 参数设置面板：演示表单（title/showTip 由功能树节点的 props 透传） -->
<script setup lang="ts">
import { reactive } from "vue";

defineProps<{
  /** 面板标题（节点 props.title） */
  title?: string;
  /** 是否显示提示条（节点 props.showTip） */
  showTip?: boolean;
}>();

const cfg = reactive({ autoReload: true, notify: true, pageSize: "10" });
</script>

<template>
  <div class="panel-settings">
    <h3 v-if="title" class="panel-settings__title">{{ title }}</h3>
    <el-alert v-if="showTip" type="info" :closable="false" show-icon
      title="这里的标题与提示条来自功能树节点声明的 props。" class="panel-settings__tip" />
    <el-form label-width="140px">
      <el-form-item label="自动刷新数据">
        <el-switch v-model="cfg.autoReload" />
      </el-form-item>
      <el-form-item label="站内通知">
        <el-switch v-model="cfg.notify" />
      </el-form-item>
      <el-form-item label="默认每页条数">
        <el-input v-model="cfg.pageSize" style="width: 120px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary">保存</el-button>
        <el-button>重置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.panel-settings {
  max-width: 480px;
  background: var(--el-bg-color, #fff);
  padding: 20px;
  border-radius: 6px;
}

.panel-settings__title {
  margin: 0 0 16px;
}

.panel-settings__tip {
  margin-bottom: 16px;
}
</style>
