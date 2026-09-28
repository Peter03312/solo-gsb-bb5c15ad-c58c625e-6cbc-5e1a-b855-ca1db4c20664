'use strict';

/*
 * 过程损耗率百分数 → 小数的精确换算（前端表单专用）。
 *
 * 输入框按百分数填写（0 ~ 99.999，最多三位小数，如 0.9 表示 0.9%），
 * 提交时必须换算为 API 的小数（0.9% -> 0.009）。禁止 `Number(text) / 100`
 * 这类浮点除法：0.9 / 100 = 0.009000000000000001，服务端会按该字面值
 * 严格取整，把恰好整除的 991 / 0.991 误判为 1000.0000000000002 而多领纸。
 *
 * 这里全程按用户输入的十进制「文本」做字符串 / BigInt 整数运算，
 * 输出规范的十进小数字符串（如 "0.009"），交给服务端既有的有理数
 * （BigInt 分子 / 分母）精确计算；直调 API 传数字（0.03）仍由服务端
 * 按其最短往返字面值解析，行为不变。
 */
(function (global) {
  /** 百分数上限 99.999%（与输入框 min / max 标示一致）。 */
  const MAX_PERCENT_SCALED = 99999n; // 99.999，按 1000 倍放大
  const PERCENT_SCALE = 1000n; // 百分数最多三位小数
  const DECIMAL_SCALE = PERCENT_SCALE * 100n; // 再除以 100：小数共 5 位

  /**
   * 校验百分数文本并精确换算为小数字符串。
   * @param {string|number} raw 用户输入的百分数（0 ~ 99.999，最多三位小数）
   * @returns {string} 十进小数字符串，如 0.9% -> "0.009"；3% -> "0.03"；0% -> "0"
   * @throws {Error} 空值 / 非十进制数字 / 超过三位小数 / 超出 0 ~ 99.999 范围时给出可读中文提示
   */
  function convertPercentToDecimalText(raw) {
    const text = String(raw ?? '').trim();
    if (text === '') {
      throw new Error('过程损耗率（%）不能为空，请填写 0 ~ 99.999 之间且最多三位小数的百分数');
    }
    if (text.length > 10) {
      throw new Error(`过程损耗率（%）「${text}」超出上限：百分数必须在 0 ~ 99.999 之间（即小数 0 ~ 0.99999）`);
    }
    // 仅接受非负十进制普通写法（允许省略整数位的 ".9" / 省略小数位的 "3."），
    // 拒绝正负号、科学计数法、百分号与任何非数字字符。
    if (!/^\d*(?:\.\d*)?$/.test(text) || !/\d/.test(text)) {
      throw new Error(`过程损耗率（%）「${text}」不是合法百分数：请填写 0 ~ 99.999 之间的十进制数字（最多三位小数）`);
    }

    const dot = text.indexOf('.');
    const intPart = dot < 0 ? text : text.slice(0, dot);
    const fracPart = dot < 0 ? '' : text.slice(dot + 1);
    if (fracPart.length > 3) {
      throw new Error(`过程损耗率（%）「${text}」小数位过多：最多支持三位小数（如 0.9、0.999、99.999）`);
    }

    // 放大到 1000 倍的整数（99.999 -> 99999）做范围比较，避免浮点误判边界。
    const digits = (intPart + (fracPart + '000').slice(0, 3)).replace(/^0+(?=\d)/, '');
    const scaled = digits === '' ? 0n : BigInt(digits);
    if (scaled > MAX_PERCENT_SCALED) {
      throw new Error(`过程损耗率（%）「${text}」超出上限：百分数必须在 0 ~ 99.999 之间（即小数 0 ~ 0.99999）`);
    }

    // 百分数 ÷ 100：scaled / 100000，用整数拆分整数位与小数位，结果为规范十进制文本。
    const whole = scaled / DECIMAL_SCALE;
    const remainder = scaled % DECIMAL_SCALE;
    let decimal = whole.toString();
    if (remainder > 0n) {
      decimal += '.' + remainder.toString().padStart(5, '0').replace(/0+$/, '');
    }
    return decimal;
  }

  global.convertPercentToDecimalText = convertPercentToDecimalText;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { convertPercentToDecimalText };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
