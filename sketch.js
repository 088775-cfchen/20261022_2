// 儲存從 CSV 載入的完整題庫與目前抽出的六道題目。
let questionBank = [];
let questions = [];
let questionTable;
let bankError = false;

// 儲存可以拖曳的文字答案，順序會在開始時打亂。
let choices = [];
// 記錄每個情境目前放入的答案索引。
let placedAnswers = [];
// 記錄目前正在拖曳的答案來源。
let dragging = null;
// 記錄是否已經交卷。
let submitted = false;
// 記錄測驗分數。
let score = 0;
// 記錄彩帶粒子。
let confetti = [];
// 記錄版面配置資料。
let layout = {};

// 在畫面建立前載入 CSV 題庫。
function preload() {
  questionTable = loadTable("question-bank.csv", "csv", "header");
}

// 建立全螢幕畫布並初始化測驗狀態。
function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("sans-serif");
  document.documentElement.lang = "zh-Hant";
  document.title = "生活小達人｜拖曳配對測驗";
  loadQuestionBank();
  if (!bankError) resetQuiz();
}

// 依照畫面尺寸重繪所有題目、答案與動畫插圖。
function draw() {
  background("#F7F6F0");
  calculateLayout();
  if (bankError) {
    drawBankError();
    return;
  }
  drawHeader();
  drawQuestionCards();
  drawAnswerChoices();
  drawSubmitButton();
  drawResult();
  drawConfetti();
}

// 將 CSV 欄位轉成題目物件，並檢查每筆資料是否完整。
function loadQuestionBank() {
  if (!questionTable || questionTable.getRowCount() < 6) {
    bankError = true;
    return;
  }
  const titles = questionTable.getColumn("title");
  const answers = questionTable.getColumn("answer");
  const scenes = questionTable.getColumn("scene");
  const colors = questionTable.getColumn("color");
  for (let index = 0; index < questionTable.getRowCount(); index++) {
    if (!titles[index] || !answers[index] || !scenes[index] || !colors[index]) continue;
    questionBank.push({ title: titles[index], answer: answers[index], scene: scenes[index], color: colors[index] });
  }
  bankError = questionBank.length < 6;
}

// 題庫未能載入時顯示可理解的提示。
function drawBankError() {
  fill("#263B36");
  noStroke();
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(20);
  text("題庫載入失敗", width / 2, height / 2 - 20);
  textStyle(NORMAL);
  textSize(14);
  text("請使用本機網站伺服器開啟，並確認 question-bank.csv 與 sketch.js 放在同一資料夾。", width / 2, height / 2 + 16, width - 40, 60);
}

// 依畫布寬度切換桌機或手機欄數，並計算卡片位置。
function calculateLayout() {
  const mobile = width < 760;
  const columns = mobile ? 2 : 6;
  const gap = mobile ? 9 : 12;
  const margin = mobile ? 16 : 28;
  const cardWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
  const gridY = mobile ? 76 : 126;
  const choiceColumns = 3;
  const choiceGap = mobile ? 8 : 10;
  const choiceHeight = mobile ? constrain(height * 0.063, 36, 44) : 52;
  const buttonHeight = 50;
  const cardHeight = mobile
    ? constrain((height - gridY - gap * 2 - 20 - (choiceHeight * 2 + choiceGap) - buttonHeight - 24) / 3, 78, 120)
    : constrain(height * 0.29, 160, 220);
  const rows = Math.ceil(questions.length / columns);
  const gridHeight = rows * cardHeight + (rows - 1) * gap;
  const choiceY = gridY + gridHeight + (mobile ? 20 : 54);
  const choiceWidth = (width - margin * 2 - choiceGap * (choiceColumns - 1)) / choiceColumns;
  const choiceRows = Math.ceil(choices.length / choiceColumns);
  const buttonWidth = min(240, width - margin * 2);
  const buttonY = max(choiceY + choiceRows * (choiceHeight + choiceGap) + 5, height - buttonHeight - 20);
  layout = { mobile, columns, gap, margin, cardWidth, cardHeight, gridY, choiceY, choiceColumns, choiceGap, choiceWidth, choiceHeight, buttonWidth, buttonHeight, buttonY };
}

// 繪製測驗標題與簡短操作提示。
function drawHeader() {
  noStroke();
  fill("#263B36");
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(layout.mobile ? 21 : 27);
  text("生活小達人", layout.margin, 29);
  textStyle(NORMAL);
  fill("#718078");
  textSize(layout.mobile ? 11 : 13);
  text("把下方答案拖到正確的生活情境", layout.margin, 55);
  fill("#DDE8D7");
  rect(width - layout.margin - 62, 20, 62, 28, 14);
  fill("#3E705A");
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(12);
  text(`${placedAnswers.filter(answer => answer !== null).length} / 6`, width - layout.margin - 31, 34);
  textStyle(NORMAL);
}

// 繪製六個固定情境卡片、動畫插圖和答案放置區。
function drawQuestionCards() {
  for (let index = 0; index < questions.length; index++) {
    const position = cardPosition(index);
    const question = questions[index];
    noStroke();
    fill("#FFFFFF");
    rect(position.x, position.y, layout.cardWidth, layout.cardHeight, 12);
    drawScene(index, position.x + layout.cardWidth / 2, position.y + (layout.mobile ? 14 : 57), position.scale);
    fill("#35453F");
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(layout.mobile ? 14 : 16);
    textLeading(layout.mobile ? 17 : 19);
    const target = targetRect(index);
    const titleHeight = layout.mobile ? 36 : 42;
    const titleGap = layout.mobile ? 6 : 8;
    const titleY = target.y - titleHeight - titleGap;
    text(question.title, position.x + 5, titleY, layout.cardWidth - 10, titleHeight);
    stroke(placedAnswers[index] === null ? "#C7D4CB" : "#62A184");
    strokeWeight(1.5);
    fill(placedAnswers[index] === null ? "#F8FAF7" : "#E7F3E9");
    rect(target.x, target.y, target.w, target.h, 8);
    noStroke();
    fill(placedAnswers[index] === null ? "#A0AAA3" : "#386B51");
    textStyle(placedAnswers[index] === null ? NORMAL : BOLD);
    textSize(layout.mobile ? 12 : 14);
    const answerText = placedAnswers[index] === null ? "拖曳答案到這裡" : choices[placedAnswers[index]];
    text(answerText, target.x + 3, target.y + 2, target.w - 6, target.h - 4);
    textStyle(NORMAL);
  }
}

// 回傳指定情境卡片在畫布中的位置與插圖縮放比例。
function cardPosition(index) {
  const column = index % layout.columns;
  const row = floor(index / layout.columns);
  const x = layout.margin + column * (layout.cardWidth + layout.gap);
  const y = layout.gridY + row * (layout.cardHeight + layout.gap);
  return { x, y, scale: layout.mobile ? 0.72 : constrain(layout.cardWidth / 95, 0.9, 1.45) };
}

// 回傳指定情境的答案放置區範圍。
function targetRect(index) {
  const position = cardPosition(index);
  const targetHeight = layout.mobile ? 30 : 36;
  return { x: position.x + 7, y: position.y + layout.cardHeight - targetHeight - 6, w: layout.cardWidth - 14, h: targetHeight };
}

// 繪製會隨時間輕微移動的生活情境插圖。
function drawScene(index, centerX, centerY, scale) {
  push();
  translate(centerX, centerY);
  scale = scale * (1 + sin(frameCount * 0.06 + index) * 0.035);
  scaleCanvas(scale);
  noStroke();
  fill(questions[index].color);
  circle(0, 0, 66);
  const scene = questions[index].scene;
  if (scene === "toothbrush") drawToothbrushScene();
  if (scene === "handwash") drawHandwashScene();
  if (scene === "crosswalk") drawCrosswalkScene();
  if (scene === "trash") drawTrashScene();
  if (scene === "sleep") drawSleepScene(questions[index].color);
  if (scene === "vegetable") drawVegetableScene();
  pop();
}

// 將插圖繪製座標縮放至卡片適用大小。
function scaleCanvas(amount) {
  scale(amount);
}

// 繪製牙刷與閃亮牙齒，代表起床後清潔口腔。
function drawToothbrushScene() {
  push();
  rotate(-0.55);
  fill("#FFFFFF");
  rect(-7, -17, 15, 27, 5);
  fill("#E97C66");
  rect(-6, 7, 13, 25, 5);
  fill("#F7D35F");
  for (let tooth = 0; tooth < 3; tooth++) rect(-7 + tooth * 5, -22, 3, 8, 2);
  pop();
  drawSparkle(20, -20, 1);
  drawSparkle(-22, 17, 0.7);
}

// 繪製洗手水龍頭、水滴和雙手。
function drawHandwashScene() {
  fill("#FFFFFF");
  rect(-20, -19, 30, 7, 4);
  rect(4, -18, 8, 17, 4);
  fill("#387C73");
  rect(-3, -7, 7, 12, 3);
  fill("#EFAE83");
  ellipse(-5, 14 + sin(frameCount * 0.15) * 2, 22, 10);
  ellipse(7, 19 - sin(frameCount * 0.15) * 2, 22, 10);
  fill("#DFF7F6");
  for (let drop = 0; drop < 3; drop++) ellipse(-8 + drop * 9, 4 + (frameCount * 2 + drop * 9) % 17, 4, 7);
}

// 繪製斑馬線與紅綠燈，代表安全過馬路。
function drawCrosswalkScene() {
  fill("#FFFFFF");
  for (let stripe = 0; stripe < 4; stripe++) rect(-24 + stripe * 13, 14, 7, 22, 2);
  fill("#405553");
  rect(13, -25, 17, 33, 6);
  fill(frameCount % 100 < 50 ? "#62C58A" : "#557466");
  circle(21.5, -14, 8);
  fill("#E66D62");
  circle(21.5, -2, 7);
  drawSparkle(-18, -19, 0.6);
}

// 繪製垃圾桶與跳動的小葉子，代表垃圾分類與不亂丟。
function drawTrashScene() {
  fill("#FFFFFF");
  rect(-16, -11, 31, 27, 5);
  rect(-19, -16, 37, 6, 3);
  fill("#78A6D1");
  rect(-9, -5, 4, 15, 2);
  rect(1, -5, 4, 15, 2);
  push();
  translate(2, -23 + sin(frameCount * 0.13) * 3);
  rotate(sin(frameCount * 0.1) * 0.35);
  fill("#83BD72");
  ellipse(0, 0, 10, 17);
  stroke("#FFFFFF");
  strokeWeight(1.5);
  line(0, 6, 0, -6);
  pop();
}

// 繪製月亮、星星和枕頭，代表晚上要好好睡覺。
function drawSleepScene(sceneColor) {
  fill("#FFFFFF");
  rect(-23, 5, 47, 16, 7);
  rect(-19, -3, 17, 12, 5);
  fill("#E8D778");
  circle(15, -18, 23);
  fill(sceneColor);
  circle(22, -23, 21);
  drawSparkle(-17, -19, 0.8);
  drawSparkle(0, -25, 0.55);
}

// 繪製蔬菜盤與晃動的胡蘿蔔，代表多吃蔬菜。
function drawVegetableScene() {
  fill("#FFFFFF");
  ellipse(0, 10, 45, 25);
  fill("#72AE68");
  ellipse(-10, 4, 15, 13);
  ellipse(1, 0, 15, 17);
  ellipse(11, 5, 14, 12);
  push();
  translate(0, -15);
  rotate(sin(frameCount * 0.12) * 0.15);
  fill("#EF9857");
  triangle(-5, -7, 5, -7, 0, 11);
  fill("#5D9C68");
  ellipse(-3, -9, 7, 9);
  ellipse(4, -10, 7, 9);
  pop();
}

// 繪製小星光，讓生活插圖有輕微動畫感。
function drawSparkle(x, y, amount) {
  push();
  translate(x, y);
  rotate(frameCount * 0.025);
  fill("#FFF7C7");
  beginShape();
  vertex(0, -8 * amount);
  vertex(2 * amount, -2 * amount);
  vertex(8 * amount, 0);
  vertex(2 * amount, 2 * amount);
  vertex(0, 8 * amount);
  vertex(-2 * amount, 2 * amount);
  vertex(-8 * amount, 0);
  vertex(-2 * amount, -2 * amount);
  endShape(CLOSE);
  pop();
}

// 繪製六個可拖曳文字答案，並顯示目前拖曳中的答案。
function drawAnswerChoices() {
  const choiceRows = Math.ceil(choices.length / layout.choiceColumns);
  const top = layout.choiceY;
  noStroke();
  fill("#63736B");
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(layout.mobile ? 13 : 15);
  text("拖曳答案", layout.margin, top - 20);
  textStyle(NORMAL);
  for (let index = 0; index < choices.length; index++) {
    const position = choicePosition(index);
    const isDragging = dragging && dragging.choiceIndex === index;
    const isUsed = placedAnswers.includes(index) && !(dragging && dragging.choiceIndex === index);
    if (isUsed || isDragging) continue;
    drawChoicePill(choices[index], position.x, position.y, position.w, position.h, false);
  }
  if (dragging) {
    drawChoicePill(choices[dragging.choiceIndex], mouseX - layout.choiceWidth / 2, mouseY - layout.choiceHeight / 2, layout.choiceWidth, layout.choiceHeight, true);
  }
  if (choiceRows < 1) return;
}

// 回傳指定文字答案在底部選項區的位置。
function choicePosition(index) {
  const column = index % layout.choiceColumns;
  const row = floor(index / layout.choiceColumns);
  return {
    x: layout.margin + column * (layout.choiceWidth + layout.choiceGap),
    y: layout.choiceY + row * (layout.choiceHeight + layout.choiceGap),
    w: layout.choiceWidth,
    h: layout.choiceHeight
  };
}

// 繪製答案膠囊，拖曳時增加陰影與抬高效果。
function drawChoicePill(label, x, y, w, h, active) {
  noStroke();
  fill(active ? "#D9A84E" : "#FFFFFF");
  rect(x, y + (active ? 3 : 0), w, h, 9);
  fill(active ? "#FFFFFF" : "#35453F");
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(layout.mobile ? 14 : 16);
  text(label, x + 5, y + 2, w - 10, h - 4);
  textStyle(NORMAL);
}

// 繪製填完六題後才能使用的交卷或重新作答按鈕。
function drawSubmitButton() {
  const complete = placedAnswers.every(answer => answer !== null);
  const buttonX = (width - layout.buttonWidth) / 2;
  const canPress = submitted || complete;
  noStroke();
  fill(canPress ? "#3D765C" : "#D2D9D3");
  rect(buttonX, layout.buttonY, layout.buttonWidth, layout.buttonHeight, 12);
  fill(canPress ? "#FFFFFF" : "#89948D");
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(15);
  text(submitted ? "再玩一次" : "交卷看成績", width / 2, layout.buttonY + layout.buttonHeight / 2);
  textStyle(NORMAL);
}

// 顯示交卷結果與正確題數。
function drawResult() {
  if (!submitted) return;
  noStroke();
  fill("#263B36");
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(layout.mobile ? 18 : 23);
  text(`答對 ${score} 題，得分 ${Math.round(score / questions.length * 100)} 分！`, width / 2, layout.buttonY - 23);
  textStyle(NORMAL);
}

// 建立並繪製高分時的彩帶動畫。
function drawConfetti() {
  if (!submitted || score / questions.length <= 0.8) return;
  if (frameCount % 3 === 0) {
    confetti.push({ x: random(width), y: -12, speed: random(2, 5), drift: random(-1.2, 1.2), size: random(5, 10), color: random(["#EF7D68", "#F0C451", "#67B69A", "#78A6D1", "#B18BC3"]) });
  }
  noStroke();
  for (let index = confetti.length - 1; index >= 0; index--) {
    const piece = confetti[index];
    piece.y += piece.speed;
    piece.x += piece.drift + sin(frameCount * 0.08 + index) * 0.7;
    fill(piece.color);
    push();
    translate(piece.x, piece.y);
    rotate(frameCount * 0.04 + index);
    rect(0, 0, piece.size, piece.size * 0.55, 2);
    pop();
    if (piece.y > height + 15) confetti.splice(index, 1);
  }
}

// 按下滑鼠或觸碰時，開始拖曳答案或按下交卷按鈕。
function mousePressed() {
  calculateLayout();
  if (pointInButton(mouseX, mouseY)) {
    if (submitted) resetQuiz();
    else if (placedAnswers.every(answer => answer !== null)) submitQuiz();
    return false;
  }
  for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
    const position = cardPosition(questionIndex);
    const imageX = position.x + layout.cardWidth / 2;
    const imageY = position.y + (layout.mobile ? 14 : 57);
    const imageRadius = 34 * position.scale;
    if (dist(mouseX, mouseY, imageX, imageY) <= imageRadius) {
      speakQuestion(questionIndex);
      return false;
    }
  }
  if (submitted) return false;
  for (let targetIndex = 0; targetIndex < placedAnswers.length; targetIndex++) {
    const target = targetRect(targetIndex);
    if (placedAnswers[targetIndex] !== null && pointInRect(mouseX, mouseY, target)) {
      dragging = { choiceIndex: placedAnswers[targetIndex], sourceTarget: targetIndex };
      placedAnswers[targetIndex] = null;
      return false;
    }
  }
  for (let choiceIndex = 0; choiceIndex < choices.length; choiceIndex++) {
    if (placedAnswers.includes(choiceIndex)) continue;
    const choice = choicePosition(choiceIndex);
    if (pointInRect(mouseX, mouseY, choice)) {
      dragging = { choiceIndex, sourceTarget: null };
      return false;
    }
  }
  return false;
}

// 使用瀏覽器繁體中文語音，親切活潑地朗讀題目並鼓勵孩子思考。
function speakQuestion(questionIndex) {
  if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  const question = questions[questionIndex];
  const utterance = new SpeechSynthesisUtterance(`${question.title} 我們一起想一想吧！`);
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find(voice => voice.lang.toLowerCase().startsWith("zh-tw"))
    || voices.find(voice => voice.lang.toLowerCase().startsWith("zh"))
    || null;
  utterance.lang = "zh-TW";
  utterance.rate = 0.9;
  utterance.pitch = 1.2;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// 放開答案時，將答案放入命中的情境區或放回原處。
function mouseReleased() {
  if (!dragging) return false;
  let destination = -1;
  for (let index = 0; index < questions.length; index++) {
    if (pointInRect(mouseX, mouseY, targetRect(index))) destination = index;
  }
  if (destination >= 0) {
    for (let index = 0; index < placedAnswers.length; index++) {
      if (placedAnswers[index] === dragging.choiceIndex) placedAnswers[index] = null;
    }
    placedAnswers[destination] = dragging.choiceIndex;
  } else if (dragging.sourceTarget !== null && placedAnswers[dragging.sourceTarget] === null) {
    placedAnswers[dragging.sourceTarget] = dragging.choiceIndex;
  }
  dragging = null;
  return false;
}

// 判斷座標是否落在指定矩形範圍內。
function pointInRect(x, y, rectData) {
  return x >= rectData.x && x <= rectData.x + rectData.w && y >= rectData.y && y <= rectData.y + rectData.h;
}

// 判斷座標是否落在交卷或重新作答按鈕上。
function pointInButton(x, y) {
  const buttonX = (width - layout.buttonWidth) / 2;
  return x >= buttonX && x <= buttonX + layout.buttonWidth && y >= layout.buttonY && y <= layout.buttonY + layout.buttonHeight;
}

// 計算答對題數並在高於百分之八十時啟動彩帶效果。
function submitQuiz() {
  score = 0;
  for (let index = 0; index < questions.length; index++) {
    if (choices[placedAnswers[index]] === questions[index].answer) score++;
  }
  submitted = true;
  confetti = [];
}

// 重設答案、分數與題目選項順序，開始新的一輪測驗。
function resetQuiz() {
  const shuffledQuestions = questionBank.slice();
  for (let index = shuffledQuestions.length - 1; index > 0; index--) {
    const randomIndex = floor(random(index + 1));
    [shuffledQuestions[index], shuffledQuestions[randomIndex]] = [shuffledQuestions[randomIndex], shuffledQuestions[index]];
  }
  questions = shuffledQuestions.slice(0, 6);
  choices = questions.map(question => question.answer);
  for (let index = choices.length - 1; index > 0; index--) {
    const randomIndex = floor(random(index + 1));
    [choices[index], choices[randomIndex]] = [choices[randomIndex], choices[index]];
  }
  placedAnswers = Array(questions.length).fill(null);
  dragging = null;
  submitted = false;
  score = 0;
  confetti = [];
}

// 視窗尺寸改變時同步調整全螢幕畫布。
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateLayout();
}
