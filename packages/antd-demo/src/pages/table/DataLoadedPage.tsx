import { useRef, useState } from "react";
import { Button } from "antd";
import {
  constData,
  constMetaFunc,
  type Meta,
  type PagedList,
  type TableApi,
} from "@ys-knife-crud/core";
import { YsTable } from "@ys-knife-crud/antd";
import DemoPageLayout from "../../shared/DemoPageLayout";
import { manyRows, metaFun } from "../../shared/demoData";

export interface DataLoadedPageProps {
  onBack: () => void;
}

const dataFun = constData(manyRows);

/** 事件日志：每条 = 一次 onDataLoaded 触发（最新的在最上面，最多保留 8 条） */
interface LoadEvent {
  seq: number;
  time: string;
  limit: number;
  offset: number;
  totalCount: number;
  hasNext: boolean;
  itemCount: number;
}

/** 日志表的列元数据：Column 允许只填 propertyPath（displayName 缺省回落到 propertyPath，
 *  showForDisplay 缺省 true，displayOrder 缺省按数组顺序） */
const logMeta: Meta = {
  displayName: "onDataLoaded 事件日志",
  description: null,
  columns: [
    { propertyPath: "seq", displayName: "#" },
    { propertyPath: "time", displayName: "触发时间" },
    { propertyPath: "limit" },
    { propertyPath: "offset" },
    { propertyPath: "totalCount" },
    { propertyPath: "hasNext" },
    { propertyPath: "itemCount", displayName: "items.length" },
  ],
};
const logMetaFun = constMetaFunc(logMeta);

export default function DataLoadedPage({ onBack }: DataLoadedPageProps) {
  const tableRef = useRef<TableApi | null>(null);
  const logTableRef = useRef<TableApi | null>(null);
  const seqRef = useRef(0);

  // constData 捕获 events 数组引用：unshift/pop 原地修改，数据源看到的一直是最新内容。
  // useState 惰性初始化保证数组与 dataFun 身份稳定，且每个页面实例各自独立。
  const [logSource] = useState(() => {
    const events: LoadEvent[] = [];
    return { events, dataFun: constData<LoadEvent>(events) };
  });

  // 所有加载路径都会到这里：首载 / 翻页 / 切每页条数 / dataFun 变化 / reload()
  function onDataLoaded(paged: PagedList<unknown>): void {
    logSource.events.unshift({
      seq: ++seqRef.current,
      time: new Date().toLocaleTimeString(),
      limit: paged.limit ?? 0,
      offset: paged.offset ?? 0,
      totalCount: paged.totalCount ?? 0,
      hasNext: paged.hasNext ?? false,
      itemCount: paged.items.length,
    });
    if (logSource.events.length > 8) logSource.events.pop();
    // YsTable 只在自身触发点加载数据，新事件到达后主动让日志表重载
    // （日志表未监听 onDataLoaded，这里不会形成事件循环）
    logTableRef.current?.reload();
  }

  const toolbar = (
    <Button type="primary" onClick={() => tableRef.current?.reload()}>
      reload()（触发事件）
    </Button>
  );

  return (
    <DemoPageLayout
      title="数据加载事件（onDataLoaded）"
      hint="Table 每次通过 dataFun 成功加载数据后触发 onDataLoaded 回调，携带本次分页结果（limit / offset / totalCount / hasNext / items）。下方日志本身就是用 YsTable 渲染的（metaFun + constData(events)），记录每一次触发：进入页面是首载，翻页、切换每页条数各触发一次，点「reload()」走组件暴露的方法同样触发。请求被取消或失败时不会触发。"
      onBack={onBack}
      toolbar={toolbar}
    >
      <div style={{ marginBottom: 16 }}>
        <YsTable
          ref={logTableRef}
          metaFun={logMetaFun}
          dataFun={logSource.dataFun}
          pageSize={8}
          rowKey="seq"
        />
      </div>

      <YsTable
        ref={tableRef}
        metaFun={metaFun}
        dataFun={dataFun}
        pageSize={10}
        onDataLoaded={onDataLoaded}
      />
    </DemoPageLayout>
  );
}
