# Site — Elisa Vasconcelos · Escritório de Arquitetura

Guia em português simples para ver, editar e publicar o site.

---

## 1. Ver o site no seu computador

Dê dois cliques no arquivo **`index.html`**. Ele abre no navegador como um site normal.
Funciona sem internet. O único detalhe é o botão do formulário, que abre o WhatsApp e por isso precisa de internet.

## 2. Editar textos e fotos (o painel)

Abra **`admin/index.html`** (de preferência no **Google Chrome** ou no **Microsoft Edge**).

- À esquerda ficam as seções do site; no meio, os campos para editar; à direita, a **prévia ao vivo**.
- **Pendências** mostra tudo o que ainda está entre `[colchetes]`. Clique num item para ir direto ao campo.
- Em cada foto há o botão **Trocar foto**: você pode enviar uma foto do computador ou do celular, ou reaproveitar uma que já está no site. Fotos grandes são reduzidas automaticamente.
- Ao terminar, clique em **Salvar alterações**.

**Onde o painel salva:**

| Onde você abriu o painel | O que acontece ao salvar |
|---|---|
| No computador, no Chrome ou no Edge | Ele pede para você escolher a **pasta do site** (a que tem o `index.html`) e grava tudo direto nela. |
| No computador, em outro navegador | Ele **baixa** o arquivo `content.js` e as fotos novas. Coloque o `content.js` na pasta `content` e as fotos na pasta `photos`. |
| No site publicado numa hospedagem com PHP (`seusite.com.br/admin`) | Pede senha e salva **direto no site publicado**. Na primeira vez, ele pede para você criar a senha. |

**Esqueceu a senha do painel online?** Pelo gerenciador de arquivos da hospedagem, apague o arquivo `admin/data/auth.php`. Na próxima vez que abrir o painel, ele pede uma senha nova.

**Desfazer:** no painel online, a seção *Salvar, senha e histórico* guarda as versões anteriores. Dá para restaurar qualquer uma.

## 3. Fotos: todas são provisórias

O ambiente onde o site foi feito não tinha acesso ao Unsplash. Por isso, as imagens da pasta `photos` são **ilustrações de arquitetura geradas por computador** (renders 3D), feitas só para preencher o layout. **Não são projetos do escritório.** Troque todas pelas fotos reais antes de publicar.

| Arquivo | Onde aparece | Formato ideal |
|---|---|---|
| `hero-torre.jpg` | Abertura (foto grande à direita do nome) | Em pé, com **céu claro na parte de cima**, porque o sobrenome passa por cima dele |
| `cobogo.jpg` | Galeria 1, folha de contato | Em pé (4:5) |
| `casa-piscina.jpg` | Galeria 2, folha de contato | Deitada |
| `escada.jpg` | Galeria 3, folha de contato | Em pé (2:3) |
| `sala-de-estar.jpg` | Galeria 4, folha de contato | Deitada |
| `volume-terracota.jpg` | Galeria 5, folha de contato | Em pé (3:4) |
| `arcos.jpg` | Galeria 6, folha de contato | Deitada |
| `oculo.jpg` | Galeria 7, folha de contato | Quadrada |
| `fachada-comercial.jpg` | Galeria 8 | Deitada |
| `cozinha.jpg` | Galeria 9, folha de contato | Em pé (4:5) |
| `pilotis.jpg` | Galeria 10, folha de contato | Deitada |
| `serie-residencial.jpg` | Projetos → Residenciais (capa), folha de contato | Em pé (4:5) |
| `serie-comercial.jpg` | Projetos → Comerciais (capa), folha de contato | Em pé (4:5) |
| `serie-interiores.jpg` | Projetos → Interiores (capa) | Em pé (4:5) |
| `maquete.jpg` | Folha de contato (a foto circulada em vermelho) | Deitada |

Dica: fotos com pelo menos 1600 px no lado maior ficam nítidas em telas grandes. Pelo painel, o site ajusta o formato sozinho. Não precisa recortar nada.

## 4. Textos que faltam (marcadores)

Tudo que está entre `[colchetes]` é informação que eu **não inventei** e precisa vir de você. O painel lista cada um em **Pendências**. Em resumo:

- E-mail, Instagram e número de registro no CAU
- Legenda da foto de abertura
- Cidade e ano de cada foto da galeria
- Seu parágrafo de apresentação (formação e trajetória)
- Os quatro números grandes (anos de escritório, projetos entregues, m² projetados, cidades atendidas)
- Valores e o que está incluído em cada serviço
- Nomes de clientes e parceiros (só os que autorizarem)

Também escrevi **sugestões de texto** que você deve revisar, porque falam em seu nome:
a citação ("Um bom projeto começa antes do desenho…"), as descrições das três frentes de projeto (incluindo "Casas · Apartamentos" e "Lojas · Escritórios"), a frase "Cada projeto é único: o valor final é definido em proposta, depois de uma primeira conversa" e o texto de apresentação da abertura.

## 5. Como colocar no ar

Nada foi publicado. Quando quiser, há dois caminhos:

**A) Hospedagem com PHP (recomendado, por causa do painel online)**
Hostinger, HostGator, Locaweb, KingHost, UOL Host e similares.
1. Registre o domínio (ex.: `elisavasconcelos.com.br`) no **registro.br** (custa por volta de R$ 40 por ano; confira o valor atual) ou pela própria hospedagem.
2. Contrate um plano básico de hospedagem compartilhada com PHP 7.4 ou mais novo.
3. No **gerenciador de arquivos** da hospedagem, envie **todo o conteúdo desta pasta** para a pasta pública (geralmente `public_html`).
4. Abra `seusite.com.br/admin` **logo em seguida** e crie a senha do painel. Até alguém criar a senha, qualquer pessoa que abrir esse endereço poderia criá-la, então não deixe para depois.
5. Ative o certificado de segurança (HTTPS / SSL), que quase todas as hospedagens oferecem de graça.

**B) Hospedagem gratuita de sites estáticos (Netlify, Cloudflare Pages, GitHub Pages)**
O site funciona perfeitamente, mas o **painel online não salva** nesses serviços, porque eles não rodam PHP. Você editaria pelo painel no computador e enviaria a pasta de novo a cada mudança. No Netlify, por exemplo, basta arrastar a pasta para o site deles.

## 6. Bom saber

- **Formulário:** não guarda nada no site. Ele monta a mensagem e abre o WhatsApp do visitante, endereçada ao (17) 99181-2268. Assim não há banco de dados nem dados pessoais guardados.
- **CAU:** a regulamentação do CAU pede que peças publicitárias de arquitetura informem o nome e o número de registro do profissional responsável. Deixei o campo no rodapé; vale confirmar a regra atual com o CAU/SP.
- **Movimento reduzido:** quem desativa animações no celular ou no computador vê o site sem os efeitos de movimento, e a galeria vira uma faixa que se arrasta de lado.
- **Fontes:** Cormorant Garamond e Epilogue, ambas de licença livre (SIL Open Font License), guardadas dentro do site (`assets/fonts`).

## 7. Para quem for mexer no código

```
index.html              estrutura da página (as seções são preenchidas pelo site.js)
content/content.js      TODOS os textos e caminhos das fotos (o painel edita este arquivo)
assets/css/site.css     visual (cores, tipografia, layout, responsivo, movimento)
assets/js/site.js       monta as seções, galeria fixada, contador, visualizador, formulário
assets/fonts/           fontes (woff2)
assets/img/             textura de grão e ícone
photos/                 fotos
admin/                  painel (index.html, admin.css, admin.js) e api.php (salvar online)
admin/data/             criado na hospedagem: senha (criptografada) e histórico. Não vai para o Git.
```

Sem dependências nem etapa de build: são arquivos comuns que abrem em qualquer navegador.
O bloco `<!--META:START-->…<!--META:END-->` do `index.html` é atualizado pelo painel (título e descrição para Google e WhatsApp).
