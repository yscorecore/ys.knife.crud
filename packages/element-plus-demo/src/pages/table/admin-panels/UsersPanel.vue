<!-- 用户管理面板：YsTable（共享 metaFun + manyRows，列宽可拖动并持久化） -->
<script setup lang="ts">
import { constData, loadLocalStorageConfig, saveLocalStorageConfig } from "@ys.knife.crud/core";
import { YsTable } from "@ys.knife.crud/element-plus";
import { manyRows, metaFun, type UserRow } from "../../shared/demoData";

const userDataFun = constData<UserRow>(manyRows);
const loadCustomConfigFun = loadLocalStorageConfig("yk-crud-demo-admin-users");
const saveCustomConfigFun = saveLocalStorageConfig("yk-crud-demo-admin-users");
</script>

<template>
  <ys-table :meta-fun="metaFun" :data-fun="userDataFun" :page-size="8" show-checkbox
    :load-custom-config-fun="loadCustomConfigFun" :save-custom-config-fun="saveCustomConfigFun" />
</template>
