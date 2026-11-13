import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="animate-in fade-in rounded-md border border-border bg-surface p-8 text-center duration-300">
      <Compass size={40} className="mx-auto mb-3 text-content-weak" aria-hidden="true" />
      <h2 className="mb-3 text-xl font-semibold">页面不存在</h2>
      <p className="mb-5 text-content-weak">请检查地址是否正确。</p>
      <Link className="inline-flex items-center gap-1.5 text-primary" to="/">
        <ArrowLeft size={16} aria-hidden="true" />
        返回首页
      </Link>
    </section>
  );
}
