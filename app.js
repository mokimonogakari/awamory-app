// === STATE ===
let state = {
  strength: "普通",
  volume: "ロング",
  scene: null,
  foods: [],
  temp: 25,
  humidity: 60,
};

// === INIT ===
function init() {
  // Food grid
  const foodGrid = document.getElementById('food-grid');
  FOOD_DATA.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'food-chip';
    btn.dataset.value = f.name;
    btn.innerHTML = `${f.name}<span class="taste-bar"><span class="taste-bar-fill" style="width:${f.intensity*20}%"></span></span>`;
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      if (state.foods.includes(f.name)) {
        state.foods = state.foods.filter(x => x !== f.name);
      } else {
        state.foods.push(f.name);
      }
    });
    foodGrid.appendChild(btn);
  });

  // Toggle groups
  setupToggleGroup('strength-group', v => state.strength = v);
  setupToggleGroup('volume-group', v => state.volume = v);
  setupToggleGroup('scene-group', v => state.scene = v, true);

  // Sliders
  const tempSlider = document.getElementById('temp-slider');
  const humidSlider = document.getElementById('humid-slider');
  tempSlider.addEventListener('input', () => {
    state.temp = +tempSlider.value;
    document.getElementById('temp-val').textContent = state.temp + '°C';
  });
  humidSlider.addEventListener('input', () => {
    state.humidity = +humidSlider.value;
    document.getElementById('humid-val').textContent = state.humidity + '%';
  });

  // CTA
  document.getElementById('recommend-btn').addEventListener('click', recommend);
}

function setupToggleGroup(groupId, setter, allowNone = false) {
  const group = document.getElementById(groupId);
  const btns = group.querySelectorAll('.toggle-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (allowNone && btn.classList.contains('active')) {
        btn.classList.remove('active');
        setter(null);
        return;
      }
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setter(btn.dataset.value);
    });
  });
}

// === SCORING ===
function scoreCocktail(c) {
  let score = 50; // base

  // Strength
  const amountMl = c.awamoriMl;
  if (state.strength === "弱い") {
    if (amountMl <= 30) score += 20;
    else if (amountMl <= 35) score += 10;
    else score -= 10;
    if (c.taste.includes("スウィート") || c.taste.includes("甘口")) score += 10;
  } else if (state.strength === "強い") {
    if (amountMl >= 45) score += 20;
    else if (amountMl >= 40) score += 15;
    else score -= 5;
    if (c.taste.includes("ドライ") || c.taste.includes("辛口")) score += 10;
  } else {
    if (amountMl >= 30 && amountMl <= 40) score += 10;
    if (c.taste.includes("ミディアム") || c.taste.includes("中口")) score += 10;
  }

  // Volume
  if (state.volume === "ロング" && c.category.includes("ロング")) score += 20;
  if (state.volume === "ショート" && c.category.includes("ショート")) score += 20;

  // Scene
  if (state.scene) {
    if (state.scene === "カップル" || state.scene === "夫婦") {
      if (c.taste.includes("スウィート") || c.taste.includes("甘口") || c.taste.includes("やや甘口")) score += 12;
      if (c.desc.includes("ロマン") || c.desc.includes("恋") || c.desc.includes("夢") || c.desc.includes("夜") || c.nameEn.includes("Night") || c.nameEn.includes("Love")) score += 8;
    }
    if (state.scene === "女子会") {
      if (c.taste.includes("スウィート") || c.taste.includes("甘口")) score += 15;
      if (c.desc.includes("女性") || c.desc.includes("可愛") || c.desc.includes("ピンク") || c.desc.includes("花")) score += 8;
      if (amountMl <= 30) score += 5;
    }
    if (state.scene === "男子会") {
      if (c.taste.includes("ドライ") || c.taste.includes("辛口")) score += 12;
      if (amountMl >= 40) score += 8;
      if (c.distill === "常圧蒸留") score += 5;
    }
    if (state.scene === "会食") {
      if (c.taste.includes("ミディアム") || c.taste.includes("中口")) score += 10;
      if (c.award) score += 10;
    }
  }

  // Food pairing
  if (state.foods.length > 0) {
    const selectedFoods = FOOD_DATA.filter(f => state.foods.includes(f.name));
    const avgIntensity = selectedFoods.reduce((s, f) => s + f.intensity, 0) / selectedFoods.length;
    const needsJouatsu = selectedFoods.some(f => f.recDistill === "常圧蒸留");
    const needsGenatsu = selectedFoods.some(f => f.recDistill === "減圧蒸留");

    if (avgIntensity >= 3.5) {
      if (c.distill === "常圧蒸留") score += 12;
      if (c.taste.includes("ドライ") || c.taste.includes("辛口") || c.taste.includes("中口")) score += 8;
    } else if (avgIntensity <= 2) {
      if (c.distill === "減圧蒸留") score += 10;
      if (c.taste.includes("スウィート") || c.taste.includes("甘口")) score += 5;
    }

    if (needsJouatsu && c.distill === "常圧蒸留") score += 8;
    if (needsGenatsu && c.distill === "減圧蒸留") score += 8;

    // Sweet food + dry cocktail
    const hasSweet = selectedFoods.some(f => f.sweet >= 4);
    if (hasSweet && c.taste.includes("ドライ")) score += 8;

    // Oily food + carbonated cocktail
    const hasOily = selectedFoods.some(f => f.oil >= 4);
    if (hasOily && c.carbonated) score += 10;
  }

  // Weather
  if (state.temp >= 30) {
    if (c.carbonated) score += 10;
    if (c.category.includes("ロング")) score += 5;
    if (c.distill === "減圧蒸留") score += 5;
  } else if (state.temp <= 18) {
    if (c.distill === "常圧蒸留") score += 8;
    if (!c.carbonated) score += 5;
    if (c.taste.includes("ドライ") || c.taste.includes("辛口")) score += 5;
  }

  if (state.humidity >= 75) {
    if (c.carbonated) score += 8;
    if (c.taste.includes("ドライ") || c.taste.includes("辛口")) score += 5;
  }

  // Award bonus
  if (c.award && c.award.includes("最優秀")) score += 5;
  if (c.award && c.award.includes("知事")) score += 3;

  return Math.min(100, Math.max(0, score));
}

// === HELPER: Calculate total volume ===
function calcTotalVolume(ingredientsStr) {
  let total = 0;
  const items = ingredientsStr.split(';');
  for (const item of items) {
    const parts = item.split(':');
    if (parts.length < 2) continue;
    const amount = parts[1].trim();
    const mlMatch = amount.match(/(\d+)\s*ml/i);
    if (mlMatch) {
      total += parseInt(mlMatch[1]);
    }
  }
  return total;
}

function recommend() {
  const scored = COCKTAILS.map(c => ({...c, score: scoreCocktail(c)}));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5);

  // Summary text
  const parts = [];
  parts.push(`度数: ${state.strength}`);
  parts.push(`スタイル: ${state.volume}`);
  if (state.scene) parts.push(`シーン: ${state.scene}`);
  if (state.foods.length) parts.push(`フード: ${state.foods.join('・')}`);
  parts.push(`${state.temp}°C / ${state.humidity}%`);
  document.getElementById('result-summary').textContent = parts.join(' / ');

  // Render cocktails
  const list = document.getElementById('cocktail-list');
  list.innerHTML = '';
  top.forEach((c, i) => {
    const ingredients = c.ingredients.split(';').map(s => {
      const [name, amount] = s.split(':').map(x => x.trim());
      return {name, amount: amount || ''};
    });

    const totalVol = calcTotalVolume(c.ingredients);

    const tags = [];
    if (c.category) tags.push(`<span class="meta-tag type">${c.category.replace('カクテル;','')}</span>`);
    if (c.taste) tags.push(`<span class="meta-tag taste">${c.taste}</span>`);
    if (c.glass) tags.push(`<span class="meta-tag glass">${c.glass}</span>`);
    if (c.distill) tags.push(`<span class="meta-tag distill">${c.distill}</span>`);
    if (c.award) tags.push(`<span class="meta-tag award">🏆 ${c.award}</span>`);

    const scoreColor = c.score >= 80 ? 'var(--gold)' : c.score >= 60 ? 'var(--teal)' : 'var(--text-dim)';

    const card = document.createElement('div');
    card.className = 'cocktail-card stagger';
    card.innerHTML = `
      <span class="card-number">${String(i+1).padStart(2,'0')}</span>
      <div class="match-score">
        <div class="score-bar"><div class="score-fill" style="width:${c.score}%;background:${scoreColor}"></div></div>
        <span class="score-label">${c.score}%</span>
      </div>
      <h3 class="cocktail-name">${c.name}</h3>
      <p class="cocktail-name-en">${c.nameEn}</p>
      <p class="cocktail-desc" id="desc-${c.id}">${c.desc}</p>
      ${c.desc.length > 80 ? `<button class="read-more" onclick="document.getElementById('desc-${c.id}').classList.toggle('expanded');this.textContent=this.textContent==='MORE →'?'LESS ←':'MORE →'">MORE →</button>` : ''}
      <div class="cocktail-meta">${tags.join('')}</div>
      <div class="recipe-section">
        <div class="recipe-title">INGREDIENTS</div>
        <div class="recipe-volume-info">
          <span class="volume-badge">泡盛 ${c.awamoriMl}ml</span>
          ${totalVol > 0 ? `<span class="volume-total">合計約 ${totalVol}ml</span>` : ''}
          ${c.carbonated ? '<span class="volume-badge carbonated-badge">炭酸</span>' : ''}
        </div>
        <ul class="ingredient-list">
          ${ingredients.map(ig => `<li><span class="ingredient-name">${ig.name}</span><span class="ingredient-amount">${ig.amount}</span></li>`).join('')}
        </ul>
        ${c.recipe ? `<div class="recipe-title">HOW TO MAKE</div><ol class="recipe-steps">${c.recipe.split(/[。;]/).filter(s => s.trim()).map(s => `<li>${s.trim()}</li>`).join('')}</ol>` : ''}
      </div>
    `;
    list.appendChild(card);
  });

  // Awamori recommendations
  const topDistill = top[0].distill;
  const recAwamori = AWAMORI_BRANDS.filter(a => {
    if (topDistill === "減圧蒸留") return a.distill === "減圧蒸留";
    return a.distill === "常圧蒸留";
  }).slice(0, 5);

  const awamoriList = document.getElementById('awamori-list');
  awamoriList.innerHTML = '';
  recAwamori.forEach(a => {
    const card = document.createElement('div');
    card.className = 'awamori-card';
    card.innerHTML = `
      <div class="awamori-info">
        <div class="awamori-brand">${a.brand}</div>
        <div class="awamori-maker">${a.maker}</div>
        <div class="awamori-detail">${a.note}</div>
        <div class="awamori-tags">
          <span class="awamori-tag">${a.distill}</span>
          <span class="awamori-tag">${a.degree}度</span>
        </div>
      </div>
    `;
    awamoriList.appendChild(card);
  });
  document.getElementById('awamori-recommend').style.display = 'block';

  // Pairing tip
  if (state.foods.length > 0) {
    const selectedFoods = FOOD_DATA.filter(f => state.foods.includes(f.name));
    const avgIntensity = selectedFoods.reduce((s, f) => s + f.intensity, 0) / selectedFoods.length;
    let tip = '';
    if (avgIntensity >= 3.5) {
      tip = `${state.foods.join('・')}は味の濃さが強めのお料理です。常圧蒸留の力強い泡盛で造るカクテルがよく合います。泡盛の深い旨味が料理の濃厚さに負けません。`;
    } else if (avgIntensity <= 2) {
      tip = `${state.foods.join('・')}はあっさりしたお料理です。減圧蒸留のフルーティーな泡盛カクテルで、繊細な味わいを楽しむのがおすすめです。`;
    } else {
      tip = `${state.foods.join('・')}は中程度の味わいのお料理です。常圧蒸留・減圧蒸留どちらの泡盛カクテルとも好相性です。お好みで選んでみてください。`;
    }
    if (state.temp >= 30) tip += ' 暑い日なので、炭酸入りのロングカクテルですっきり楽しむのも良いですね。';
    if (state.temp <= 18) tip += ' 涼しい日には、常圧蒸留の芳醇な泡盛カクテルで温まりましょう。';
    document.getElementById('pairing-text').textContent = tip;
    document.getElementById('pairing-section').style.display = 'block';
  }

  // Show results
  const results = document.getElementById('results');
  results.classList.add('visible');
  results.scrollIntoView({behavior:'smooth',block:'start'});
}

document.addEventListener('DOMContentLoaded', init);
