import os
import re

pages_dir = "client/src/pages"

# Cores de texto que podem ter baixo contraste contra fundo escuro
problematic_colors = [
    'text-slate-600',
    'text-slate-500',
    'text-gray-600',
    'text-gray-500',
    'text-slate-700',
    'text-gray-700',
]

# Procurar por cards com essas cores
for file in os.listdir(pages_dir):
    if not file.endswith('.tsx'):
        continue
    
    filepath = os.path.join(pages_dir, file)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Procurar por padrões de cards com cores problemáticas
    for color in problematic_colors:
        if color in content and ('bg-white' in content or 'rounded-' in content):
            # Encontrou um card com cor problemática
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if color in line and ('bg-white' in line or 'card' in line.lower()):
                    print(f"{file}:{i+1} - {color} encontrado em card")
                    print(f"  {line.strip()[:100]}")
                    print()

print("✨ Revisão de contraste concluída!")
