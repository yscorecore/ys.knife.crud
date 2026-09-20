/**
 * 枚举选项数据源契约:framework-agnostic,不依赖 Vue。
 *
 * 由 @ys.knife.crud/element-plus 的 YsEnumFilterItem 消费:
 * 组件 onMounted 调用一次,结果缓存到 options ref,用于渲染 el-select 选项。
 *
 * 设计为函数类型而非对象:使用方在 dataFunc 里把字段提取成 {label, value} 结构,
 * 不用再传 keyProperty/valueProperty——把"如何提取字段"这件事留给数据源声明方,
 * 组件端只关心 value 是选中值、label 是显示文本。
 *
 * 提供一组工厂函数(fromOptions/fromObjectItems/fromArray/fromBool)方便
 * 把常见数据形态(对象数组/原始值数组/布尔二元)转成 EnumOptionsSource。
 */
export type EnumOptionsSource = (abortController?: AbortController) => Promise<EnumOption[]>;

/**
 * 枚举选项结构:value 是选中值,label 是显示文本。
 *
 * - value: 送入 v-model 与 filter,作为 ys.knife.query.js 的 con 包装的值。
 *   允许 string | number | boolean,兼容字符串 id(如 "dev")、数字 code(如 1)
 *   与布尔枚举(如启用/禁用)三种常见形态。
 * - label: el-option :label 的来源,只能是字符串(声明方负责转字符串),
 *   组件端不再做 String() 转换,直接绑定。
 */
export interface EnumOption {
  /** 显示文本(el-option :label),只能是字符串 */
  label: string;
  /** 选中值,送入 v-model 与 filter(作为 con 包装的值) */
  value: string | number | boolean;
}

/**
 * 从已组装好的 EnumOption[] 构造数据源;静态数据场景用。
 * 内部用 Promise.resolve 包装,保持与异步数据源一致的调用契约。
 */
export function fromOptions(options: EnumOption[]): EnumOptionsSource {
  return () => Promise.resolve(options);
}

/**
 * 从对象数组构造数据源:按 labelProperty/valueProperty 提取字段。
 * 适合后端 DTO / ORM 实体等已有字段名的数据形态,不用手动 map。
 *
 * 注意:label/value 字段的运行时类型由调用方负责保证(label 必须 string,
 * value 必须是 string | number | boolean 之一);这里用 as 断言绕过静态检查,
 * 因为 keyof T 提取的属性类型无法在编译期约束成具体字面量类型。
 */
export function fromObjectItems<T>(
  items: T[],
  labelProperty: keyof T,
  valueProperty: keyof T,
): EnumOptionsSource {
  return () =>
    Promise.resolve(
      items.map((item) => ({
        label: item[labelProperty] as string,
        value: item[valueProperty] as string | number | boolean,
      })),
    );
}

/**
 * 从原始值数组构造数据源:label 与 value 同源(都是该项本身)。
 * 适合状态码列表 [1, 2, 3]、标签 id 列表 ["dev", "qa"] 等简单场景。
 */
export function fromArray(items: string[] | number[] | boolean[]): EnumOptionsSource {
  return () =>
    Promise.resolve(
      items.map((item) => ({
        label: item as string,
        value: item as string | number | boolean,
      })),
    );
}

/**
 * 布尔二元枚举数据源:典型场景如「启用/禁用」「是/否」。
 * value 固定为 true/false,label 由调用方指定。
 */
export function fromBool(trueLabel: string, falseLabel: string): EnumOptionsSource {
  return () =>
    Promise.resolve([
      { label: trueLabel, value: true },
      { label: falseLabel, value: false },
    ]);
}
