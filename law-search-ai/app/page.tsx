'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setAnswer('');
    setSources([]);

    try {
      const res = await fetch('/api/search-law', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (err) {
      setAnswer('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto pt-20 px-4">
        <h1 className="text-4xl font-bold text-center mb-2">법률 검색 AI</h1>
        <p className="text-center text-gray-600 mb-10">법제처 공식 데이터를 기반으로 답변합니다</p>

        <form onSubmit={handleSearch} className="relative mb-12">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: 민법 제750조 불법행위 배상액은 어떻게 되나요?"
            className="w-full px-6 py-4 text-lg border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 disabled:opacity-50"
          >
            검색
          </button>
        </form>

        {loading && <p className="text-center">법제처 검색 중 + Gemini 답변 생성 중...</p>}

        {answer && (
          <div className="bg-white rounded-2xl shadow p-8 prose max-w-none">
            <ReactMarkdown>{answer}</ReactMarkdown>

            {sources.length > 0 && (
              <div className="mt-10 pt-6 border-t">
                <h3 className="font-semibold mb-3">📌 근거 자료 (법제처)</h3>
                <ul className="space-y-3">
                  {sources.map((s, i) => (
                    <li key={i} className="text-sm">
                      <a href={s.link} target="_blank" className="text-blue-600 hover:underline">
                        {s.title}
                      </a>
                      {s.article && <span> - {s.article}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
