# Créditos das imagens

As fotos do banner da página inicial e dos produtos iniciais do modo de
demonstração são fotos de banco gratuito do [Pexels](https://www.pexels.com),
usadas sob a [licença Pexels](https://www.pexels.com/license/) (uso comercial
gratuito, crédito não obrigatório; o crédito fica aqui por boa prática).

São imagens **ilustrativas da categoria**: não mostram o estoque da Bruna nem
produtos específicos à venda. Foram escolhidas fotos sem marca visível; ao
trocar alguma, mantenha esse cuidado. Quando o catálogo real estiver no
painel, as fotos cadastradas pela Bruna substituem estas.

| Arquivo local | Uso | Foto no Pexels | Fotógrafo(a) | Tratamento |
|---|---|---|---|---|
| `src/assets/hero-boutique.webp` | Banner da página inicial | [Spray Bottle on a White Table](https://www.pexels.com/photo/spray-bottle-on-a-white-table-6801177/) (6801177) | Artem Podrez | Espelhada na horizontal (texto à esquerda), 2400×1350, WebP |
| `public/demo/produtos/paleta-de-sombras-foto.webp` | Paleta de sombras | [Powders against a Purple Backgrounds](https://www.pexels.com/photo/powders-against-a-purple-backgrounds-7256131/) (7256131) | DS stories | Recorte quadrado 1200×1200, WebP |
| `public/demo/produtos/colonia-floral-foto.webp` | Colônia floral | [A Clear Glass Perfume Bottle on the Table](https://www.pexels.com/photo/a-clear-glass-perfume-bottle-on-the-table-8450248/) (8450248) | MART PRODUCTION | Recorte quadrado 1200×1200, WebP |
| `public/demo/produtos/hidratante-corporal-foto.webp` | Hidratante corporal | [White Plastic Pump Bottle With Shadow On Beige Background](https://www.pexels.com/photo/white-plastic-pump-bottle-with-shadow-on-beige-background-7814991/) (7814991) | Mikhail Nilov | Recorte quadrado 1200×1200, WebP |
| `public/demo/produtos/necessaire-de-viagem-foto.webp` | Necessaire de viagem | [Pouch With Several Makeup](https://www.pexels.com/photo/pouch-with-several-makeup-3373739/) (3373739) | Shiny Diamond | Recorte quadrado 1200×1200, WebP |
| `public/demo/produtos/body-splash-foto.webp` | Body splash | [Elegant Pink Perfume Bottles on White Background](https://www.pexels.com/photo/elegant-pink-perfume-bottles-on-white-background-36437999/) (36437999) | Salva F. Ayala | Recorte quadrado 1200×1200, WebP |
| `public/demo/produtos/base-liquida-foto.webp` | Base líquida | [Close-Up Shot of Cosmetic Products on a Brown Surface](https://www.pexels.com/photo/close-up-shot-of-cosmetic-products-on-a-brown-surface-7256108/) (7256108) | DS stories | Recorte quadrado 1200×1200, WebP |
| `public/demo/produtos/shampoo-nutritivo-foto.webp` | Shampoo nutritivo | [Orange and Black Pump Bottle](https://www.pexels.com/photo/orange-and-black-pump-bottle-4154194/) (4154194) | cottonbro studio | Recorte quadrado 1200×1200, WebP |
| `public/demo/produtos/kit-presente-foto.webp` | Kit presente (inativo) | [A White and Pink Gift Box](https://www.pexels.com/photo/a-white-and-pink-gift-box-5704738/) (5704738) | Anastasia Shuraeva | Recorte quadrado 1200×1200, WebP |

Os arquivos originais foram baixados de `images.pexels.com` (2400 px de
largura) e convertidos com o `sharp` do projeto. O Next gera as versões
menores de cada tela a partir destes arquivos.

Ao trocar uma foto de produto, use um **nome de arquivo novo** (por isso o
sufixo `-foto`): o cache de imagens otimizadas, local e da Vercel, continua
servindo a versão antiga quando só o conteúdo muda. Navegadores que ainda
guardam as antigas ilustrações (`<produto>.webp`) passam a mostrar a foto
automaticamente (`RETIRED_DRAWING` em `src/lib/demo/model.ts`).
