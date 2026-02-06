document.addEventListener('DOMContentLoaded', () => {
    const calcBtn = document.getElementById('calc-btn');
    const resetBtn = document.getElementById('reset-btn');
    const resultArea = document.getElementById('result-area');

    // Inputs
    const baseFareInput = document.getElementById('base-fare');
    const expressFareInput = document.getElementById('express-fare');
    const distanceCheck = document.getElementById('distance-over-100');
    const companySelect = document.getElementById('company-select');
    const stationFrom = document.getElementById('station-from');
    const stationTo = document.getElementById('station-to');

    // Radio buttons
    const disabilityTypeRadios = document.getElementsByName('disability-type');
    const travelModeRadios = document.getElementsByName('travel-mode');

    // Outputs
    const pBase = document.getElementById('p-base');
    const pExpress = document.getElementById('p-express');
    const pTotal = document.getElementById('p-total');

    const cSection = document.getElementById('caregiver-section');
    const cBase = document.getElementById('c-base');
    const cExpress = document.getElementById('c-express');
    const cTotal = document.getElementById('c-total');

    const grandTotalSpan = document.getElementById('grand-total');

    // --- データ定義 ---

    // 会社ごとのルール設定
    // distanceLimit: 単独乗車時の割引適用距離 (単位: km)。nullなら単独割引なし。
    // type2CaregiverDiscount: 第2種で大人介護者への割引があるか (通常false)
    // rounding: 'floor' (切り捨て) or 'ceil' (切り上げ) - 10円単位
    const COMPANY_RULES = {
        // JR: 切り捨て
        'JR': { distanceLimit: 100, rounding: 'floor' },

        // 私鉄: 多くは切り上げ
        'Kintetsu': { distanceLimit: 100, rounding: 'ceil' }, // 101km以上、切り上げ
        'Tobu': { distanceLimit: 100, rounding: 'ceil' }, // 101km以上? 文言は100km超
        'Odakyu': { distanceLimit: 100, rounding: 'ceil' }, // 101km以上
        'Seibu': { distanceLimit: 50, rounding: 'ceil' }, // 西武のみ50km超
        'Meitetsu': { distanceLimit: 100, rounding: 'ceil' },
        'Nankai': { distanceLimit: 100, rounding: 'ceil' },

        // 以下、定義上100km超ルールあっても実質不可能な場合も多いが、規定通り設定
        'Metro': { distanceLimit: 100, rounding: 'ceil' }, // 101km以上規定あり
        'Hankyu': { distanceLimit: 100, rounding: 'ceil' }, // 101km以上規定あり
        'Hanshin': { distanceLimit: 100, rounding: 'ceil' }, // 101km以上規定あり

        'Keihan': { distanceLimit: null, rounding: 'ceil' }, // 単独割引なし明記
        'Nishitetsu': { distanceLimit: null, rounding: 'ceil' }, // 規定不明/実質なし
        'Sotetsu': { distanceLimit: null, rounding: 'ceil' },
        'Keikyu': { distanceLimit: null, rounding: 'ceil' },
        'Keisei': { distanceLimit: null, rounding: 'ceil' },
        'Tokyu': { distanceLimit: null, rounding: 'ceil' },
        'Other': { distanceLimit: null, rounding: 'ceil' }
    };

    // 主要新幹線運賃データ (JRのみ使用)
    const FARE_DATA = {
        // 東海道・山陽
        "東京-名古屋": { base: 6380, express: 4920 },
        "東京-京都": { base: 8360, express: 5810 },
        "東京-新大阪": { base: 8910, express: 5810 },
        "東京-新神戸": { base: 9460, express: 5920 },
        "東京-岡山": { base: 10670, express: 7030 },
        "東京-広島": { base: 11880, express: 7460 },
        "東京-博多": { base: 14080, express: 9310 },
        "名古屋-新大阪": { base: 3410, express: 3270 },
        "新大阪-博多": { base: 9790, express: 5810 },

        // 東北
        "東京-仙台": { base: 6050, express: 5360 },
        "東京-盛岡": { base: 8580, express: 6430 },
        "東京-新青森": { base: 10340, express: 7520 },
        "仙台-新青森": { base: 6050, express: 5360 },

        // 北陸
        "東京-金沢": { base: 7480, express: 6900 },
        "東京-長野": { base: 4070, express: 4200 }
    };

    // --- ロジック ---

    function getFare(st1, st2) {
        if (!st1 || !st2 || st1 === st2) return null;
        let key = `${st1}-${st2}`;
        if (FARE_DATA[key]) return FARE_DATA[key];
        key = `${st2}-${st1}`;
        if (FARE_DATA[key]) return FARE_DATA[key];
        return null;
    }

    // 端数処理関数
    function roundFare(amount, mode) {
        if (mode === 'ceil') {
            // 10円未満切り上げ
            return Math.ceil(amount / 10) * 10;
        } else {
            // 10円未満切り捨て (JR標準)
            return Math.floor(amount / 10) * 10;
        }
    }

    // 運賃自動入力
    function updateFare() {
        if (companySelect.value !== 'JR') return;

        const s1 = stationFrom.value;
        const s2 = stationTo.value;
        const data = getFare(s1, s2);

        if (data) {
            baseFareInput.value = data.base;
            expressFareInput.value = data.express;
            distanceCheck.checked = true;
            highlightInput(baseFareInput);
            highlightInput(expressFareInput);
        }
    }

    function highlightInput(el) {
        el.style.backgroundColor = "#e8f0fe";
        setTimeout(() => el.style.backgroundColor = "", 1000);
    }

    function updateCompanyRules() {
        const comp = companySelect.value;
        const rule = COMPANY_RULES[comp] || { distanceLimit: null };

        const wrapper = distanceCheck.closest('.checkbox-group');
        const labelTextSpan = document.getElementById('distance-label-text');
        const note = wrapper.querySelector('.note');

        if (rule.distanceLimit !== null) {
            distanceCheck.disabled = false;
            wrapper.style.opacity = '1';
            labelTextSpan.textContent = ` 片道の営業キロが${rule.distanceLimit}km(${rule.distanceLimit + 1}km)を超える`;
            note.textContent = `※${rule.distanceLimit}kmを超えると単独割引が適用されます。`;
        } else {
            distanceCheck.checked = false;
            distanceCheck.disabled = true;
            wrapper.style.opacity = '0.5';
            labelTextSpan.textContent = ' 片道の営業キロが規定を超える';
            note.textContent = '※選択された会社では、単独割引設定がないか、該当路線がありません。';
        }

        if (comp !== 'JR') {
            stationFrom.value = '';
            stationTo.value = '';
        }
    }

    // 計算ロジック
    function calculate() {
        const baseFare = parseInt(baseFareInput.value) || 0;
        const expressFare = parseInt(expressFareInput.value) || 0;
        const isOverDist = distanceCheck.checked;
        const company = companySelect.value;

        let type = '1';
        for (const r of disabilityTypeRadios) if (r.checked) type = r.value;

        let mode = 'with_caregiver';
        for (const r of travelModeRadios) if (r.checked) mode = r.value;

        let pBaseFare = baseFare;
        let pExpressFare = expressFare;
        let cBaseFare = 0;
        let cExpressFare = 0;

        // ルール取得
        const rule = COMPANY_RULES[company] || { distanceLimit: null, rounding: 'ceil' };
        const rMode = rule.rounding;

        // --- 割引適用 ---

        // 第1種
        if (type === '1') {
            if (mode === 'with_caregiver') {
                // 介護者と一緒: 5割引き
                pBaseFare = roundFare(baseFare * 0.5, rMode);
                cBaseFare = roundFare(baseFare * 0.5, rMode);

                // 特急券割引なし
                pExpressFare = expressFare;
                cExpressFare = expressFare;
            } else {
                // 本人のみ
                if (rule.distanceLimit !== null && isOverDist) {
                    pBaseFare = roundFare(baseFare * 0.5, rMode);
                }
                cBaseFare = 0;
                cExpressFare = 0;
            }
        }
        // 第2種
        else if (type === '2') {
            if (mode === 'with_caregiver') {
                // 第2種 介護者付き
                // 本人: 距離超なら割引
                if (rule.distanceLimit !== null && isOverDist) {
                    pBaseFare = roundFare(baseFare * 0.5, rMode);
                }

                // 介護者: 通常割引なし (大人)
                cBaseFare = baseFare;
                cExpressFare = expressFare;
            } else {
                // 本人のみ
                if (rule.distanceLimit !== null && isOverDist) {
                    pBaseFare = roundFare(baseFare * 0.5, rMode);
                }
                cBaseFare = 0;
                cExpressFare = 0;
            }
        }

        // --- 結果表示 ---
        const fmt = (n) => n.toLocaleString() + '円';

        pBase.textContent = fmt(pBaseFare);
        pExpress.textContent = fmt(pExpressFare);
        pTotal.textContent = fmt(pBaseFare + pExpressFare);

        if (mode === 'with_caregiver') {
            cSection.style.display = 'block';
            cBase.textContent = fmt(cBaseFare);
            cExpress.textContent = fmt(cExpressFare);
            cTotal.textContent = fmt(cBaseFare + cExpressFare);

            grandTotalSpan.textContent = fmt(pBaseFare + pExpressFare + cBaseFare + cExpressFare);
        } else {
            cSection.style.display = 'none';
            grandTotalSpan.textContent = fmt(pBaseFare + pExpressFare);
        }

        resultArea.classList.remove('hidden');
        resultArea.scrollIntoView({ behavior: 'smooth' });
    }

    // イベントリスナー
    calcBtn.addEventListener('click', calculate);

    resetBtn.addEventListener('click', () => {
        document.getElementById('calculator-form').reset();
        resultArea.classList.add('hidden');
        updateCompanyRules();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    stationFrom.addEventListener('change', updateFare);
    stationTo.addEventListener('change', updateFare);
    companySelect.addEventListener('change', updateCompanyRules);

    // 初期化
    updateCompanyRules();
});
