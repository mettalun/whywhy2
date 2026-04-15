export const PRESENTATION_TEST_DATA = {
  app: "whywhy-sheet",
  version: "3.0.0",
  rootId: "node-1",
  nodes: [
    {
      id: "node-1",
      type: "problem",
      level: 0,
      text: "搬送ラインで製品が停止した",
      parentId: null,
      nextId: "node-2",
      children: [],
      x: 0,
      y: 0
    },
    {
      id: "node-2",
      type: "why",
      level: 1,
      text: "センサーがワークの位置を誤検知した",
      parentId: "node-1",
      nextId: "node-3",
      children: [],
      x: 0,
      y: 0
    },
    {
      id: "node-3",
      type: "why",
      level: 2,
      text: "センサー前面に粉じんが付着していた",
      parentId: "node-2",
      nextId: "node-4",
      children: [],
      x: 0,
      y: 0
    },
    {
      id: "node-4",
      type: "why",
      level: 3,
      text: "清掃周期が設備の粉じん量に対して不足していた",
      parentId: "node-3",
      nextId: "node-5",
      children: [],
      x: 0,
      y: 0
    },
    {
      id: "node-5",
      type: "why",
      level: 4,
      text: "保全基準書にセンサー清掃頻度の具体値がなかった",
      parentId: "node-4",
      nextId: "node-6",
      children: [],
      x: 0,
      y: 0
    },
    {
      id: "node-6",
      type: "why",
      level: 5,
      text: "粉じん発生設備の点検実績が標準書へ反映されていなかった",
      parentId: "node-5",
      nextId: "node-7",
      children: [],
      x: 0,
      y: 0
    },
    {
      id: "node-7",
      type: "countermeasure",
      level: 6,
      text: "保全標準書へ清掃頻度と点検記録ルールを追加し、週次監査を行う",
      parentId: "node-6",
      nextId: null,
      children: [],
      x: 0,
      y: 0
    }
  ]
};
