with open('/home/ubuntu/meta-dashboard/client/src/pages/RankingProfissional.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# 1. Atualizar gerarTextoRanking para incluir qtdServicos e qtdProdutos
old1 = 'ranking: Array<{ nome: string; apelido?: string | null; totalGeral: number; totalServicos?: number; totalProdutos?: number; pctMeta?: number | null }>,'
new1 = 'ranking: Array<{ nome: string; apelido?: string | null; totalGeral: number; totalServicos?: number; totalProdutos?: number; qtdServicos?: number; qtdProdutos?: number; pctMeta?: number | null }>,'
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes.append("tipo do ranking atualizado")

old2 = '    const pct = p.pctMeta ? ` (${p.pctMeta}% meta)` : "";\n    linhas.push(`${pos} ${nome} \u2014 ${valor}${pct}`);'
new2 = '    const pct = p.pctMeta ? ` | ${p.pctMeta}% meta` : "";\n    const svcs = p.qtdServicos != null ? `\u2702\ufe0f ${p.qtdServicos} serv` : "";\n    const prds = p.qtdProdutos != null && p.qtdProdutos > 0 ? ` \ud83d\udecd\ufe0f ${p.qtdProdutos} prod` : "";\n    const detalhe = (svcs || prds) ? `\\n   ${svcs}${prds}` : "";\n    linhas.push(`${pos} *${nome}* \u2014 ${valor}${pct}${detalhe}`);'
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes.append("linhas do ranking com qtd servicos/produtos")

# 2. Remover uploadMutation
old3 = '  const uploadMutation = trpc.uploadRankingImagem.useMutation();\n\n  /**\n   * Gera a imagem do ranking, faz upload para S3 e abre o WhatsApp\n   * com a mensagem de texto + link p\u00fablico da imagem.\n   * Se grupoLink for fornecido, copia a mensagem e abre o grupo.\n   */'
new3 = '  /**\n   * Monta o texto informativo do ranking e abre o WhatsApp.\n   * Se grupoLink for fornecido, copia a mensagem e abre o grupo.\n   */'
if old3 in content:
    content = content.replace(old3, new3, 1)
    changes.append("uploadMutation removido")

# 3. Remover geração de imagem e upload do fluxo
old4 = '      // 1. Gerar imagem PNG\n      const dataUrl = await toPng(exportRef.current, {\n        backgroundColor: "#0f172a",\n        pixelRatio: 2,\n      });\n\n      // 2. Fazer upload para S3 e obter URL p\u00fablica\n      toast.loading("Enviando imagem...", { id: "upload-ranking" });\n      let imagemUrl: string | null = null;\n      try {\n        const result = await uploadMutation.mutateAsync({\n          imageBase64: dataUrl,\n          nomeArquivo: nomeArquivo.replace(/[^a-z0-9-]/gi, \'-\'),\n        });\n        imagemUrl = result.url;\n        toast.dismiss("upload-ranking");\n      } catch (uploadErr) {\n        toast.dismiss("upload-ranking");\n        console.warn("Upload falhou, usando apenas texto:", uploadErr);\n      }\n\n      // 3. Montar mensagem com texto do ranking + link da imagem\n      const textoBase = mensagemTexto ?? "\ud83c\udfc6 Confira o ranking!";\n      const mensagemFinal = imagemUrl\n        ? `${textoBase}\\n\\n\ud83d\uddbc\ufe0f Ver imagem: ${imagemUrl}`\n        : textoBase;'
new4 = '      // Usar apenas o texto informativo (sem imagem)\n      const mensagemFinal = mensagemTexto ?? "\ud83c\udfc6 Confira o ranking!";'
if old4 in content:
    content = content.replace(old4, new4, 1)
    changes.append("bloco upload removido")

# 4. Remover dependência uploadMutation do useCallback
old5 = '  }, [exportando, uploadMutation]);'
new5 = '  }, [exportando]);'
if old5 in content:
    content = content.replace(old5, new5, 1)
    changes.append("dependencia uploadMutation removida")

# 5. Remover nomeArquivo do exportar (não é mais necessário para WhatsApp)
# Manter a assinatura mas tornar nomeArquivo opcional
old6 = '  const exportar = useCallback(async (\n    nomeArquivo: string,\n    mensagemTexto?: string,\n    grupoLink?: string | null\n  ) => {\n    if (!exportRef.current || exportando) return;\n    setExportando(true);\n    try {'
new6 = '  const exportar = useCallback(async (\n    _nomeArquivo: string,\n    mensagemTexto?: string,\n    grupoLink?: string | null\n  ) => {\n    if (exportando) return;\n    setExportando(true);\n    try {'
if old6 in content:
    content = content.replace(old6, new6, 1)
    changes.append("nomeArquivo tornado opcional")

# 6. Remover o dismiss do toast que não existe mais
old7 = '      toast.dismiss("upload-ranking");\n      console.error("Erro ao exportar imagem:", e);\n      toast.error("Erro ao gerar imagem.");'
new7 = '      console.error("Erro ao enviar para WhatsApp:", e);\n      toast.error("Erro ao preparar mensagem.");'
if old7 in content:
    content = content.replace(old7, new7, 1)
    changes.append("erro toast corrigido")

with open('/home/ubuntu/meta-dashboard/client/src/pages/RankingProfissional.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Alteracoes aplicadas:", changes)
print("Total:", len(changes))
