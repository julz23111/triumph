const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_TOKEN || process.env.OPENAI_API_KEY
});

async function analyzeBookImage(base64Image) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this image of a book and extract the title and author. Return ONLY a JSON object with 'title' and 'author' fields. If you cannot determine the title or author, use 'Unknown' for that field. Example: {\"title\": \"The Great Gatsby\", \"author\": \"F. Scott Fitzgerald\"}"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });

    const content = response.choices[0].message.content;
    
    // Try to parse JSON from the response
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const bookInfo = JSON.parse(jsonMatch[0]);
        return {
          title: bookInfo.title || 'Unknown',
          author: bookInfo.author || 'Unknown'
        };
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
    }

    // Fallback: try to extract title and author from text
    const titleMatch = content.match(/title["\s:]+([^",\n]+)/i);
    const authorMatch = content.match(/author["\s:]+([^",\n]+)/i);

    return {
      title: titleMatch ? titleMatch[1].trim() : 'Unknown',
      author: authorMatch ? authorMatch[1].trim() : 'Unknown'
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error('Failed to analyze book image with OpenAI: ' + error.message);
  }
}

module.exports = {
  analyzeBookImage
};
