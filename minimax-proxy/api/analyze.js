// api/analyze.js
export default async function handler(req, res) {
  // 1. 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. 获取 App 传来的 Base64 图片
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'Missing image' });
  }

  // 3. 从环境变量读取 MiniMax API Key（安全）
  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
  if (!MINIMAX_API_KEY) {
    return res.status(500).json({ error: 'Server config error' });
  }

  // 4. 构造请求 MiniMax 的内容
  const content = [
    {
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
    },
    {
      type: 'text',
      text: `你是一个药品识别专家。请分析这张药品图片，提取以下信息并以严格的JSON格式返回，不要包含任何其他文字：
{
    "drugName": "药名（中文）",
    "manufacturer": "生产厂家",
    "usage": "用法用量（如：每日3次，每次1片）",
    "contraindication": "禁忌或注意事项",
    "category": "药品分类（从以下选择：感冒药、退烧药、止痛药、消炎药、外用药、肠胃药、维生素/保健品、钙片/矿物质、眼药水、皮肤药、防护用品、呼吸系统、心血管、其他）"
}
只返回JSON，不要任何其他解释文字。`
    }
  ];

  try {
    // 5. 调用 MiniMax API
    const response = await fetch('https://api.minimax.chat/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        messages: [{ role: 'user', content }],
        max_tokens: 1024,
        temperature: 0.3
      })
    });

    const data = await response.json();

    // 6. 解析 MiniMax 返回的内容
    const resultText = data.choices?.[0]?.message?.content || "";

    // 尝试提取 JSON 部分
    let result;
    try {
      result = JSON.parse(resultText);
    } catch {
      const jsonMatch = resultText.match(/{[\s\S]*}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(500).json({ error: '无法解析 AI 返回结果' });
      }
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'AI service error: ' + error.message });
  }
}
