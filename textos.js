/* ==========================================================================
   MahjongON! - textos.js (os textos do Como Jogar e da tabela de yaku; sem lógica)
   Quatro abas: O site, Regras, Yaku e Dicas.
   Marcadores: [[234m 55p 1z]] vira uma fileira de peças desenhadas; {{yaku}} e {{pontos}} viram as tabelas.
   Notação das peças: número + letra. m = Caracteres, p = Pontos, s = Bambus, z = Honras
   (1z Leste, 2z Sul, 3z Oeste, 4z Norte, 5z Dragão Branco, 6z Dragão Verde, 7z Dragão Vermelho). 0m, 0p e 0s são os 5 vermelhos.
   ========================================================================== */
window.MTXT = (function () {
  'use strict';

  /* [han fechada, han aberta ('-' = só fechada), nome, japonês, o que é, exemplo] */
  const YAKU = [
    { titulo: '1 han', itens: [
      ['1', '-', 'Riichi', '立直', 'Mão fechada a uma peça de ganhar. Você declara, paga 1000 pontos e a mão fica travada: daí em diante só descarta o que comprar.', ''],
      ['1', '-', 'Ippatsu', '一発', 'Ganhar até a sua próxima compra depois do riichi, sem que ninguém chame nenhuma peça no meio.', ''],
      ['1', '-', 'Menzen Tsumo', '門前清自摸和', 'Mão fechada que ganha com a própria compra.', ''],
      ['1', '1', 'Tanyao', '断幺九', 'Só peças de 2 a 8. Nenhuma ponta (1 e 9) nem honra. Aqui vale também com a mão aberta.', '[[234m 567m 345p 678s 44p]]'],
      ['1', '-', 'Pinfu', '平和', 'Quatro sequências e um par sem valor, esperando por duas pontas (como 45 esperando 3 ou 6). O par não pode ser de Dragão nem do seu vento.', '[[123m 456m 789p 234s 55p]]'],
      ['1', '-', 'Iipeikou', '一盃口', 'Duas sequências iguais, do mesmo naipe.', '[[223344m 567p 789s 55p]]'],
      ['1', '1', 'Yakuhai', '役牌', 'Trio ou quadra de Dragão (Branco, Verde, Vermelho), do vento da rodada ou do seu vento. Cada um vale 1 han.', '[[666z 123m 456p 789s 11m]]'],
      ['1', '1', 'Haitei', '海底摸月', 'Ganhar com a última peça comprada do muro.', ''],
      ['1', '1', 'Houtei', '河底撈魚', 'Ganhar com o último descarte da mão.', ''],
      ['1', '1', 'Rinshan', '嶺上開花', 'Ganhar com a peça que você compra do muro morto depois de fazer um kan.', ''],
      ['1', '1', 'Chankan', '搶槓', 'Ganhar com a peça que outro jogador acrescenta para fazer um kan.', '']
    ] },
    { titulo: '2 han', itens: [
      ['2', '-', 'Duplo Riichi', 'ダブル立直', 'Riichi na sua primeira jogada, antes de qualquer chamada.', ''],
      ['2', '-', 'Chiitoitsu', '七対子', 'Sete pares diferentes. Vale sempre 25 fu.', '[[11m 33m 55p 77p 99s 22s 44z]]'],
      ['2', '1', 'Sanshoku Doujun', '三色同順', 'A mesma sequência nos três naipes.', '[[123m 123p 123s 456m 77p]]'],
      ['2', '1', 'Ittsu', '一気通貫', 'Uma escadinha completa de 1 a 9 no mesmo naipe, em três sequências.', '[[123m 456m 789m 234p 55s]]'],
      ['2', '1', 'Chanta', '混全帯幺九', 'Todo grupo e o par têm uma ponta ou uma honra, com pelo menos uma sequência e uma honra.', '[[123m 789p 123s 999m 11z]]'],
      ['2', '2', 'Toitoi', '対々和', 'Quatro trios (ou quadras) e um par, sem sequências.', '[[222m 555p 888s 444p 11z]]'],
      ['2', '2', 'Sanankou', '三暗刻', 'Três trios fechados. Um trio completado com ron sobre descarte conta como aberto.', '[[111m 444p 777s 234m 55s]]'],
      ['2', '2', 'Sanshoku Doukou', '三色同刻', 'O mesmo número em trio nos três naipes.', '[[333m 333p 333s 456m 77p]]'],
      ['2', '2', 'Sankantsu', '三槓子', 'Três quadras (kan) na mesma mão.', ''],
      ['2', '2', 'Shousangen', '小三元', 'Dois trios de Dragão e um par do terceiro Dragão.', '[[555z 666z 77z 123m 456p]]'],
      ['2', '2', 'Honroutou', '混老頭', 'Só pontas e honras. Vem junto com toitoi ou chiitoitsu.', '[[111m 999p 111s 111z 99m]]']
    ] },
    { titulo: '3 han ou mais', itens: [
      ['3', '2', 'Honitsu', '混一色', 'Um só naipe, mais honras.', '[[123m 345m 789m 555z 11z]]'],
      ['3', '2', 'Junchan', '純全帯幺九', 'Como o chanta, mas sem honras: toda sequência e todo trio tem uma ponta, e o par também.', '[[123m 789m 123p 789s 11p]]'],
      ['3', '-', 'Ryanpeikou', '二盃口', 'Dois iipeikou na mesma mão.', '[[223344m 667788p 55s]]'],
      ['6', '5', 'Chinitsu', '清一色', 'Um só naipe, sem nenhuma honra.', '[[123m 456m 789m 234m 55m]]']
    ] },
    { titulo: 'Yakuman (mão máxima)', itens: [
      ['Y', '-', 'Tenhou', '天和', 'O dealer ganha com as 14 peças iniciais.', ''],
      ['Y', '-', 'Chiihou', '地和', 'Quem não é dealer ganha na primeira compra, sem ninguém ter chamado nada.', ''],
      ['Y', '-', 'Kokushi Musou', '国士無双', 'As 13 pontas e honras diferentes, mais uma repetida.', '[[19m19p19s1234567z1m]]'],
      ['Y', '-', 'Suuankou', '四暗刻', 'Quatro trios fechados. Se a espera era só o par, vale yakuman duplo.', '[[111m 444p 777s 222m 55p]]'],
      ['Y', 'Y', 'Daisangen', '大三元', 'Trios dos três Dragões.', '[[555z 666z 777z 123m 11p]]'],
      ['Y', 'Y', 'Shousuushii', '小四喜', 'Três trios de vento e o quarto vento como par.', '[[111z 222z 33z 444z 123m]]'],
      ['YY', 'YY', 'Daisuushii', '大四喜', 'Trios dos quatro ventos. Vale yakuman duplo.', '[[111z 222z 333z 444z 11m]]'],
      ['Y', 'Y', 'Tsuuiisou', '字一色', 'Só honras.', '[[111z 222z 555z 666z 77z]]'],
      ['Y', 'Y', 'Chinroutou', '清老頭', 'Só pontas (1 e 9), sem honras.', '[[111m 999m 111p 999p 11s]]'],
      ['Y', 'Y', 'Ryuuiisou', '緑一色', 'Só peças verdes: bambus 2, 3, 4, 6, 8 e o Dragão Verde.', '[[234s 234s 666s 888s 66z]]'],
      ['Y', '-', 'Chuuren Poutou', '九蓮宝燈', 'Um só naipe: 1112345678999 mais qualquer peça do mesmo naipe.', '[[1112345678999m 5m]]'],
      ['Y', 'Y', 'Suukantsu', '四槓子', 'Quatro quadras (kan).', '']
    ] }
  ];

  const site = `
<h3>Mahjong japonês, no seu aparelho</h3>
<p>O MahjongON! joga o <b>Riichi</b>, o mahjong japonês, com as regras que as partidas online costumam usar. Você joga contra <b>três robôs</b>, em partidas completas de quatro jogadores, com as <b>peças originais</b> desenhadas em SVG. Tudo roda no seu aparelho, sem conexão.</p>
<p>Na primeira vez que você abre o jogo, esta ajuda aparece sozinha. Para voltar a ela, toque em <b>Como Jogar</b>, no alto da tela.</p>

<h3>A mesa</h3>
<p>Você é a mão de baixo. Os três robôs ficam à direita, em cima e à esquerda. No meio da mesa há uma caixa com o <b>vento da rodada</b> (por exemplo "Leste 1"), o <b>honba</b>, os bastões de <b>riichi</b> deixados no centro, quantas peças ainda existem no <b>muro</b> e o indicador do <b>dora</b>, a peça que dá bônus.</p>
<ul>
  <li>Ao redor da caixa ficam os <b>descartes</b> de cada jogador, em fileiras de seis, na ordem em que as peças foram jogadas.</li>
  <li>O <b>último descarte</b> ganha uma borda amarela, para você ver o que acabou de cair.</li>
  <li>Uma peça com uma <b>faixa vermelha</b> embaixo é a que declarou o riichi daquele jogador. Uma peça <b>apagada</b> foi levada por uma chamada (pon, chi ou kan).</li>
  <li>Abaixo ficam os <b>cartões dos jogadores</b>: nome, vento, pontos, riichi e as peças que ele chamou. A borda amarela mostra de quem é a vez e o <b>東</b> marca o dealer.</li>
</ul>

<h3>Sua mão</h3>
<p>Abaixo da mesa ficam as suas peças, sempre em ordem. A peça que você acabou de comprar fica separada, à direita. Se a tela for estreita, a mão se divide em duas fileiras para as peças ficarem grandes o bastante.</p>
<ol>
  <li><b>Toque numa peça</b> para escolhê-la. Ela sobe um pouco e o jogo mostra o que acontece se você a descartar: quantas peças faltam para ficar pronto (shanten) ou, se já estiver pronto, por quais peças espera.</li>
  <li><b>Toque de novo na mesma peça</b> (ou no botão <b>Descartar</b>) para jogá-la fora.</li>
  <li>Se tocou na peça errada, toque em outra. Nada é descartado até o segundo toque.</li>
</ol>
<p>Os 5 vermelhos (<b>aka dora</b>) aparecem com o número em vermelho e valem 1 han cada um. Dá para desligar isso na tela de nova partida.</p>

<h3>Os botões de ação</h3>
<p>Na sua vez, aparecem só os botões que valem naquele momento:</p>
<ul>
  <li><b>Tsumo:</b> a peça que você comprou completa a mão. Toque para vencer.</li>
  <li><b>Riichi:</b> você está a uma peça de ganhar com a mão fechada. Toque em Riichi e depois na peça que quer descartar (só as peças que mantêm a mão pronta ficam acesas).</li>
  <li><b>Kan:</b> você tem quatro peças iguais, ou um pon que ganhou a quarta peça.</li>
  <li><b>9 pontas:</b> cancela a mão (só na primeira jogada, com nove ou mais pontas e honras diferentes).</li>
</ul>
<p>Quando outro jogador descarta algo que você pode usar, o jogo para e mostra a <b>barra de chamadas</b>, com a peça em destaque e os botões:</p>
<ul>
  <li><b>Ron:</b> a peça completa a sua mão. Vence na hora.</li>
  <li><b>Pon:</b> você pega a peça para fazer um trio com duas que tem. Há um botão para cada jeito de fazer (com ou sem o 5 vermelho).</li>
  <li><b>Chi:</b> você pega o descarte do jogador à sua esquerda para fazer uma sequência. Cada jeito possível ganha um botão, com as três peças desenhadas.</li>
  <li><b>Kan:</b> pega o descarte para fazer uma quadra com três que você tem.</li>
  <li><b>Passar:</b> não faz nada.</li>
</ul>
<p>Se você tocar em Passar quando podia dar Ron, fica em <b>furiten</b> (veja em Regras).</p>

<h3>Ajudas</h3>
<p>No fim da tela fica o painel <b>Ajudas</b>:</p>
<ul>
  <li><b>Velocidade dos robôs:</b> Rápido, Normal ou Lento.</li>
  <li><b>Mostrar esperas:</b> ao escolher uma peça, o jogo diz por quais peças você esperaria e quantas ainda restam.</li>
  <li><b>Descartar sozinho no riichi:</b> depois do riichi, a peça comprada é descartada automaticamente, a não ser que dê para ganhar ou fazer um kan. Desligue se preferir fazer você mesmo.</li>
  <li><b>Dica:</b> o botão Dica sugere uma jogada e explica o motivo. <b>Partidas em que você usou a Dica não entram nas estatísticas</b>, para elas continuarem honestas.</li>
</ul>

<h3>Começar e acompanhar a partida</h3>
<p>Toque no botão grande do alto (ou em <b>Nova partida</b>) e escolha:</p>
<ol>
  <li><b>Duração:</b> Hanchan (rodadas do Leste e do Sul) ou Tonpuusen (só a rodada do Leste, mais curto).</li>
  <li><b>Peças vermelhas:</b> com ou sem aka dora.</li>
  <li><b>Nível dos robôs:</b> de 1 a 5, ou Variados, que mistura níveis.</li>
  <li>Toque em <b>Jogar</b>.</li>
</ol>
<p>Cada partida começa com 25.000 pontos para cada um. Ao fim de cada mão aparece uma tela com o resultado: as peças da mão vencedora, os yaku (as combinações que valem pontos), han, fu e quem pagou quanto. No fim da partida, o jogo mostra a colocação e a pontuação final.</p>
<p>A partida é <b>salva sozinha</b> a cada jogada. Se você fechar o jogo, ele volta de onde parou. As estatísticas ficam no menu (☰), junto com som, vibração, tema escuro e redução de animações. Sem conexão, o jogo continua funcionando.</p>
<p>No computador e com o celular deitado, os controles ficam na esquerda e a mesa na direita, sempre à vista.</p>
`;

  const regras = `
<h3>O objetivo</h3>
<p>Formar uma mão completa de <b>14 peças</b>: <b>quatro grupos e um par</b>. Um grupo é uma <b>sequência</b> (três números seguidos do mesmo naipe, como [[345p]]) ou um <b>trio</b> (três peças iguais, como [[777s]]). O par são duas peças iguais. Há duas mãos especiais: <b>sete pares</b> e <b>kokushi</b> (as 13 pontas e honras).</p>
<p>Mas atenção: <b>não basta completar a mão</b>. Ela precisa ter pelo menos <b>um yaku</b>, uma combinação que vale pontos (veja a aba Yaku). Sem yaku, a mão está pronta mas não pode vencer.</p>

<h3>As 136 peças</h3>
<ul>
  <li><b>Caracteres (m), Pontos (p) e Bambus (s):</b> do 1 ao 9, quatro de cada. São os três naipes.</li>
  <li><b>Ventos:</b> Leste, Sul, Oeste e Norte, quatro de cada.</li>
  <li><b>Dragões:</b> Branco, Verde e Vermelho, quatro de cada.</li>
  <li><b>Vermelhos (aka dora):</b> um dos quatro 5 de cada naipe é vermelho e vale 1 han extra.</li>
  <li>Ventos e dragões são <b>honras</b>. As honras e os números 1 e 9 são <b>pontas</b>. As peças de 2 a 8 são <b>simples</b>.</li>
  <li>O Riichi não usa flores nem estações.</li>
</ul>

<h3>Uma mão, passo a passo</h3>
<ol>
  <li>Cada um recebe 13 peças. O <b>dealer</b> (o jogador do vento Leste) começa. A cada mão que o dealer não vence, o papel passa ao próximo, no sentido anti-horário.</li>
  <li>Na sua vez, você <b>compra</b> uma peça do muro (agora tem 14) e <b>descarta</b> uma (volta a 13).</li>
  <li>Quando você tem 13 peças a uma só de ganhar, está em <b>tenpai</b> (pronto). A peça que falta é a sua <b>espera</b>.</li>
  <li>Você ganha de duas formas: <b>tsumo</b>, comprando do muro a peça que completa, ou <b>ron</b>, pegando o descarte de outro jogador.</li>
  <li>A mão acaba quando alguém vence ou quando o muro esgota (o chamado <b>ryuukyoku</b>).</li>
</ol>

<h3>Chamadas</h3>
<p>Você pode pegar o descarte de outro jogador e formar um grupo <b>aberto</b>, que fica à mostra:</p>
<ul>
  <li><b>Chi:</b> sequência, só com o descarte de quem joga logo antes de você.</li>
  <li><b>Pon:</b> trio, com o descarte de qualquer um.</li>
  <li><b>Kan:</b> quadra. Pode ser <b>aberto</b> (com um descarte), <b>fechado</b> (quatro peças da mão, o grupo continua fechado) ou <b>acrescentado</b> (a quarta peça a um pon seu). Cada kan dá uma <b>peça do muro morto</b> e revela <b>mais um indicador de dora</b>: na hora, no kan fechado, e depois do descarte seguinte, nos outros.</li>
  <li>Depois de pegar a peça, você descarta uma. O jogo segue a partir de quem chamou.</li>
  <li><b>Prioridade:</b> ron vale mais que pon e kan, que valem mais que chi. Mais de um jogador pode dar ron no mesmo descarte (<b>ron duplo</b>). Três rons juntos cancelam a mão.</li>
</ul>
<p>Mão com grupos abertos fica menos valiosa: vários yaku (como riichi, pinfu e iipeikou) exigem a <b>mão fechada</b>, e alguns valem 1 han a menos quando aberta. Kan fechado não abre a mão.</p>

<h3>Riichi</h3>
<p>Com a <b>mão fechada em tenpai</b>, você pode declarar riichi ao descartar. Você paga <b>1000 pontos</b> (que ficam no centro, para quem vencer a mão), a mão fica travada e você só pode descartar a peça que comprar. Em troca, ganha 1 han e o direito ao <b>ura dora</b>: ao vencer, o jogo vira os indicadores escondidos sob os dora e eles contam como mais bônus.</p>
<ul>
  <li>Precisa ter ao menos 1000 pontos e pelo menos 4 peças no muro.</li>
  <li>Em riichi, só é permitido um kan fechado que não mude as esperas da mão.</li>
  <li>Se o seu riichi levar um ron, você perde o riichi: os 1000 pontos não são pagos.</li>
</ul>

<h3>Furiten</h3>
<p>Você <b>não pode dar ron</b> (só tsumo) se:</p>
<ul>
  <li>alguma peça pela qual você espera já está <b>nos seus próprios descartes</b>, mesmo que tenha sido levada por chamada;</li>
  <li>você <b>deixou passar</b> um descarte que dava ron, até a sua próxima jogada. Em riichi, essa regra vale pelo resto da mão.</li>
</ul>
<p>Quando você está em furiten, o jogo mostra um aviso na tela.</p>

<h3>Dora</h3>
<p>Dora não é yaku: é bônus de han, <b>mas só conta se a mão já tiver um yaku</b>. A peça mostrada no indicador não é o dora: o dora é a <b>próxima</b> peça (1 vira 2, 9 volta ao 1, Leste vira Sul, Norte volta ao Leste, Branco vira Verde, Verde vira Vermelho, Vermelho volta ao Branco). Cada dora na mão vale 1 han. O aka dora (5 vermelho) vale 1 han, e o ura dora (só com riichi) também.</p>

<h3>Pontos: han e fu</h3>
<p>O valor da mão vem de dois números: o <b>han</b> (vem dos yaku e do dora) e o <b>fu</b> (pontos de base, que dependem do tipo da mão: 20 fu de partida, mais bônus por trios, quadras, par de valor, tipo de espera, tsumo e mão fechada). O jogo calcula tudo e mostra o detalhe no fim da mão.</p>
<p>A partir de <b>5 han</b> (ou menos han com fu alto) a mão chega ao <b>limite</b>, e o valor passa a ser por faixas:</p>
<ul>
  <li><b>Mangan:</b> 5 han, ou 4 han com fu alto, ou 3 han com fu muito alto. Vale 8000 (12000 para o dealer).</li>
  <li><b>Haneman:</b> 6 e 7 han. <b>Baiman:</b> 8 a 10 han. <b>Sanbaiman:</b> 11 e 12 han.</li>
  <li><b>Yakuman:</b> mão máxima, ou 13 han somados (kazoe yakuman).</li>
</ul>
<p>Os valores do dealer são 1,5 vez os dos demais. No tsumo, os três pagam. No ron, só quem descartou paga tudo. Veja os valores na aba Yaku.</p>
<p>O <b>honba</b> conta quantas vezes o dealer repetiu ou a mão empatou. Cada bastão soma 300 pontos ao valor da mão (100 de cada um no tsumo).</p>

<h3>O fim da mão</h3>
<ul>
  <li><b>Alguém venceu:</b> os pontos passam de quem pagou para quem ganhou, e quem venceu leva também os bastões de riichi do centro. Se o dealer venceu, ele <b>repete</b>. Senão, o papel passa ao próximo.</li>
  <li><b>Muro esgotado (ryuukyoku):</b> quem está em tenpai recebe e quem não está paga, num total de 3000 pontos dividido entre os dois grupos. O dealer repete se estiver em tenpai.</li>
  <li><b>Nagashi mangan:</b> se todos os seus descartes foram pontas ou honras e nenhum foi levado por chamada, o esgotamento do muro vale um mangan para você.</li>
  <li><b>Mãos canceladas (sem pontos, o dealer repete):</b> <b>9 pontas</b> na primeira jogada, se você quiser desistir; <b>quatro ventos iguais</b> descartados na primeira rodada; <b>quatro riichis</b>; <b>quatro kans</b> de jogadores diferentes; <b>três rons</b> no mesmo descarte.</li>
  <li><b>Pao:</b> se o seu descarte completou o terceiro trio de Dragão (ou o quarto de vento) de um jogador e ele acaba vencendo um daisangen (ou daisuushii), você paga a mão no lugar dos outros.</li>
</ul>

<h3>A partida</h3>
<p>No <b>Hanchan</b> jogam-se as rodadas do Leste e do Sul. No <b>Tonpuusen</b>, só as do Leste. Se ninguém tiver 30.000 pontos ou mais no fim, a partida segue para uma rodada extra. Ela termina também se alguém ficar com menos de 0 pontos.</p>
<p>O resultado final é: (pontos menos 30.000) divididos por 1000, mais o <b>uma</b> (20, 10, menos 10 e menos 20 para 1º, 2º, 3º e 4º). O primeiro lugar fecha a conta, de modo que a soma dos quatro dá zero (isso inclui o bônus de 20 do <b>oka</b>).</p>

<h3>Regras que este jogo usa</h3>
<ul>
  <li>Tanyao vale com a mão aberta (kuitan), e o yaku pode ser completado pela própria peça chamada (atozuke).</li>
  <li>Ron duplo vale e ron triplo cancela a mão.</li>
  <li>Os 5 vermelhos são um de cada naipe (ou nenhum, se você preferir).</li>
  <li>O jogo não tem penalidade por erro de mão (chombo): as ações só aparecem quando são permitidas.</li>
</ul>
`;

  const yaku = `
<h3>O que é um yaku</h3>
<p>Yaku é uma combinação que dá o direito de vencer. A tabela abaixo traz os que o jogo reconhece, com os han de cada um quando a mão está <b>fechada</b> e quando está <b>aberta</b> (com chi, pon ou kan aberto). O traço (-) quer dizer que o yaku só existe com a mão fechada. Quando ajuda, vem desenhada uma mão de exemplo.</p>
{{yaku}}
<h3>Valores de uma mão</h3>
<p>Valores sem honba nem bastões de riichi. No tsumo, aparece o que cada um paga. No ron, aparece o total que o descartador paga.</p>
{{pontos}}
`;

  const dicas = `
<h3>Para começar bem</h3>
<ul>
  <li><b>Foque em um yaku fácil.</b> Riichi, tanyao e yakuhai resolvem a maioria das mãos. Se a mão não caminha para nenhum yaku, não chame peças só por chamar.</li>
  <li><b>Mão fechada vale mais.</b> Riichi, pinfu e menzen tsumo só existem fechados. Chamar faz a mão perder valor e entrega informação aos outros.</li>
  <li><b>Descarte primeiro as honras soltas e as pontas isoladas.</b> Elas são as menos úteis para fazer sequências.</li>
  <li><b>Guarde as peças do meio.</b> As do 3 ao 7 se ligam a mais combinações.</li>
  <li><b>Cuidado com o dora.</b> Uma mão com dora e sem yaku não vence. Garanta o yaku antes.</li>
</ul>

<h3>Ler a mesa</h3>
<ul>
  <li><b>Alguém declarou riichi?</b> Descartar uma peça que ele já descartou é seguro, porque ele não pode dar ron nela. Depois dessas, as pontas e as honras que já saíram bastante são as mais seguras. As peças do meio (4 a 6) são as mais perigosas.</li>
  <li><b>Honras que já apareceram duas ou três vezes</b> são seguras de jogar: quase ninguém espera por elas.</li>
  <li><b>Um jogador que descarta muito de dois naipes</b> costuma estar juntando o terceiro. Quem chamou várias vezes do mesmo naipe provavelmente faz honitsu ou chinitsu.</li>
  <li><b>Se a sua mão está longe de ficar pronta e alguém declarou riichi</b>, desista de atacar e defenda até o fim da mão.</li>
</ul>

<h3>Quando declarar riichi</h3>
<ul>
  <li>Vale a pena com <b>boas esperas</b> (várias peças restantes), mão ainda sem yaku, dora na mão ou no começo da mão.</li>
  <li>Evite quando a espera é ruim (uma peça só, ou peças quase todas já descartadas) e a mão já vale bastante sem riichi.</li>
  <li>O jogo mostra, ao escolher a peça, por quais peças você espera e quantas ainda restam. Use isso.</li>
</ul>

<h3>Quando chamar</h3>
<ul>
  <li><b>Pon de Dragão ou de vento de valor</b> costuma compensar: já garante o yaku.</li>
  <li><b>Chi</b> só vale se avançar muito a mão e ela tiver um yaku que aceite mão aberta (como tanyao).</li>
  <li><b>Não aceite uma chamada que deixe a mão sem yaku:</b> o jogo permite, mas você não poderá vencer.</li>
</ul>

<h3>O resto do jogo</h3>
<ul>
  <li>No fim da partida, a colocação conta mais que os pontos: olhe sempre o que falta para subir ou para não cair.</li>
  <li>O dealer paga e recebe mais. Mantê-lo ou tirá-lo da vez muda o ritmo da partida.</li>
  <li>Ficar em tenpai no esgotamento do muro sempre ajuda: você recebe ou paga menos.</li>
</ul>
`;

  return { YAKU: YAKU, site: site, regras: regras, yaku: yaku, dicas: dicas };
})();
