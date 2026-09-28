'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { convertPercentToDecimalText } = require('../public/percent');

test('百分数文本精确换算为小数字符串：全程不做浮点除法', () => {
  // 问题场景：0.9% 必须换算为 "0.009"，而不是 0.9 / 100 的 0.009000000000000001
  assert.equal(convertPercentToDecimalText('0.9'), '0.009');
  assert.equal(convertPercentToDecimalText('3'), '0.03');
  assert.equal(convertPercentToDecimalText('3.5'), '0.035');
  assert.equal(convertPercentToDecimalText('0'), '0');
  assert.equal(convertPercentToDecimalText('0.001'), '0.00001');
  assert.equal(convertPercentToDecimalText('12.345'), '0.12345');
  assert.equal(convertPercentToDecimalText('99.999'), '0.99999');
  // 末尾补零不影响结果（输出规范十进制文本）
  assert.equal(convertPercentToDecimalText('10.000'), '0.1');
  assert.equal(convertPercentToDecimalText('0.010'), '0.0001');
  assert.equal(convertPercentToDecimalText('0.000'), '0');
  // 浏览器 type=number 可能给出省略整数位 / 小数位的写法
  assert.equal(convertPercentToDecimalText('.9'), '0.009');
  assert.equal(convertPercentToDecimalText('3.'), '0.03');
  assert.equal(convertPercentToDecimalText('  0.9  '), '0.009');
});

test('与浮点除法对比：所有可输入百分数换算结果均为服务端可精确解析的十进制文本', () => {
  // 百分数最大 99.999% -> 小数 < 1，输出恒为 "0" 或 "0.xxx"（至多 5 位小数、无浮点尾数）。
  for (const pct of ['0', '0.001', '0.009', '0.9', '3', '3.14', '10', '50', '99.999']) {
    const decimalText = convertPercentToDecimalText(pct);
    assert.match(decimalText, /^0(?:\.\d{1,5})?$/, `「${pct}」换算结果异常：${decimalText}`);
  }
  // 对比浮点除法的问题写法：0.9 / 100 带浮点尾巴，文本换算结果不带
  assert.notEqual(String(Number('0.9') / 100), '0.009');
  assert.equal(String(Number('0.9') / 100), '0.009000000000000001');
  assert.equal(convertPercentToDecimalText('0.9'), '0.009');
});

test('非法百分数给出可读中文提示', () => {
  for (const bad of ['', '   ', null, undefined, 'abc', '0.9%', '-1', '+0.9', '1e-3', '0.9.1']) {
    assert.throws(
      () => convertPercentToDecimalText(bad),
      /过程损耗率/,
      `「${String(bad)}」应被拒绝`
    );
  }
});

test('超过三位小数或超出 0 ~ 99.999 范围被拒绝并给出可读提示', () => {
  for (const bad of ['99.9999', '0.0001', '100', '100.000', '999', '1e2']) {
    assert.throws(
      () => convertPercentToDecimalText(bad),
      /过程损耗率/,
      `「${bad}」应被拒绝`
    );
  }
  // 边界值本身合法
  assert.equal(convertPercentToDecimalText('0'), '0');
  assert.equal(convertPercentToDecimalText('99.999'), '0.99999');
  // 错误信息须可读：分别点明空值 / 小数位 / 范围原因
  assert.throws(() => convertPercentToDecimalText('0.0001'), /三位小数/);
  assert.throws(() => convertPercentToDecimalText('100'), /超出上限/);
  assert.throws(() => convertPercentToDecimalText(''), /不能为空/);
});
