import { constData, loadLocalStorageConfig, saveLocalStorageConfig } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import { manyRows, metaFun, type UserRow } from "../../../shared/demoData";

/** 用户管理面板：YsTable（共享 metaFun + manyRows，列宽可拖动并持久化） */
const userDataFun = constData<UserRow>(manyRows);
const loadCustomConfigFun = loadLocalStorageConfig("yk-crud-demo-admin-users");
const saveCustomConfigFun = saveLocalStorageConfig("yk-crud-demo-admin-users");

export function UsersPanel() {
  return (
    <YsTable
      metaFun={metaFun}
      dataFun={userDataFun}
      pageSize={8}
      showCheckbox
      loadCustomConfigFun={loadCustomConfigFun}
      saveCustomConfigFun={saveCustomConfigFun}
    />
  );
}

export default UsersPanel;
