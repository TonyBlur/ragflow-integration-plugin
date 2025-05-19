import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function TestPage() {
  const router = useRouter();

  useEffect(() => {
    // 检查URL参数，决定重定向到哪个测试页面
    const { query } = router;
    const target = query.mode === 'integration' ? '/integration-test' : '/test-render';
    router.push(target);
  }, [router]);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>正在重定向到测试页面...</p>
      <p style={{ color: '#999', fontSize: '12px', marginTop: '10px' }}>
        提示: 使用 <code>?mode=integration</code> 参数访问集成测试页面
      </p>
    </div>
  );
}
