import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

interface NewsDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
            <Construction className="w-10 h-10 text-gray-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          개발 중입니다
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-8">
          뉴스 상세 페이지는 현재 개발 중입니다.
          <br />
          빠른 시일 내에 찾아뵙겠습니다.
        </p>

        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          메인으로 돌아가기
        </Link>

        {/* News ID (for debugging) */}
        <p className="mt-8 text-sm text-gray-400">
          News ID: {id}
        </p>
      </div>
    </div>
  );
}
