import { constData, constMetaFunc, loadLocalStorageConfig, saveLocalStorageConfig, type Meta } from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";

interface OrderRow {
  orderNo: string;
  product: string;
  amount: number;
  status: string;
}

const orderRows: OrderRow[] = [
  { orderNo: "SO-2026-0001", product: "机械键盘", amount: 399, status: "已支付" },
  { orderNo: "SO-2026-0002", product: "27 寸显示器", amount: 1899, status: "已发货" },
  { orderNo: "SO-2026-0003", product: "人体工学椅", amount: 1299, status: "已支付" },
  { orderNo: "SO-2026-0004", product: "无线鼠标", amount: 199, status: "待支付" },
  { orderNo: "SO-2026-0005", product: "USB-C 扩展坞", amount: 349, status: "已完成" },
  { orderNo: "SO-2026-0006", product: "升降桌", amount: 2199, status: "已发货" },
  { orderNo: "SO-2026-0007", product: "桌面音箱", amount: 599, status: "已取消" },
  { orderNo: "SO-2026-0008", product: "网络摄像头", amount: 259, status: "已支付" },
];

const orderMeta: Meta = {
  displayName: "订单",
  description: "订单表",
  columns: [
    { propertyPath: "orderNo", displayName: "订单号", showForDisplay: true, displayOrder: 1 },
    { propertyPath: "product", displayName: "商品", showForDisplay: true, displayOrder: 2 },
    { propertyPath: "amount", displayName: "金额", showForDisplay: true, displayOrder: 3 },
    { propertyPath: "status", displayName: "状态", showForDisplay: true, displayOrder: 4 },
  ],
};

const orderMetaFun = constMetaFunc(orderMeta);
const orderDataFun = constData<OrderRow>(orderRows);
const loadCustomConfigFun = loadLocalStorageConfig("yk-crud-demo-admin-orders");
const saveCustomConfigFun = saveLocalStorageConfig("yk-crud-demo-admin-orders");

/** 订单管理面板：YsTable（页面内自定义 Meta，列宽可拖动并持久化） */
export function OrdersPanel() {
  return (
    <YsTable
      metaFun={orderMetaFun}
      dataFun={orderDataFun}
      pageSize={8}
      loadCustomConfigFun={loadCustomConfigFun}
      saveCustomConfigFun={saveCustomConfigFun}
    />
  );
}

export default OrdersPanel;
