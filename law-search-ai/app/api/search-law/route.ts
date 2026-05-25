import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Free Tier 추천

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  // 1. korean-law-mcp로 법제처 검색
  let lawData = '';
  let sources: any[] = [];

  try {
    // CLI 방식 또는 programmatic 방식으로 호출 (예시)
    const { searchLaw } = await import('korean-law-mcp'); // 실제 사용법에 따라 조정
    const result = await searchLaw(query); // 패키지 실제 메서드명 확인 필요

    lawData = result.text || JSON.stringify(result, null, 2);
    sources = result.sources || [];
  } catch (e) {
    lawData = '법제처 검색 결과를 가져오지 못했습니다.';
  }

  // 2. Gemini에게 전달해 자연어 답변 생성
  const prompt = `
당신은 대한민국 법률 전문 AI 어시스턴트입니다.
아래는 법제처에서 가져온 공식 데이터입니다. 이 데이터만 기반으로 정확하고 친절하게 답변하세요.
출처는 반드시 명시하고, 법률 용어는 쉽게 풀어서 설명해주세요.

검색어: ${query}

법제처 데이터:
${lawData}
`;

  const result = await model.generateContent(prompt);
  const answer = result.response.text();

  return Response.json({
    answer: answer + `\n\n**참고**: 본 답변은 법제처 Open API 데이터를 기반으로 하며, 법적 조언이 아닙니다.`,
    sources,
  });
}
