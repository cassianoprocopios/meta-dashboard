import { useEffect, useRef, useState, type ReactNode } from "react";

interface TabPanelProps {
  /** Chave única da aba — quando muda, a animação é re-disparada */
  tabKey: string;
  children: ReactNode;
  className?: string;
}

/**
 * Envolve o conteúdo de uma aba e aplica animação de fade+slide
 * toda vez que `tabKey` muda. Usa apenas CSS — sem dependências externas.
 */
export default function TabPanel({ tabKey, children, className = "" }: TabPanelProps) {
  const [animKey, setAnimKey] = useState(tabKey);
  const [visible, setVisible] = useState(true);
  const prevKeyRef = useRef(tabKey);

  useEffect(() => {
    if (tabKey === prevKeyRef.current) return;
    prevKeyRef.current = tabKey;

    // Força re-montagem da animação trocando a key
    setVisible(false);
    const t = requestAnimationFrame(() => {
      setAnimKey(tabKey);
      setVisible(true);
    });
    return () => cancelAnimationFrame(t);
  }, [tabKey]);

  if (!visible) return null;

  return (
    <div key={animKey} className={`tab-enter ${className}`}>
      {children}
    </div>
  );
}
