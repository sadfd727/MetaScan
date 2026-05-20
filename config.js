export const metaboliteData = [
    { id: 'PYRIMIDINE', name: '嘧啶', enName: 'Pyrimidine', category: 'nitrogen', mz: 102.9925, hmdb: 'HMDB0003361', ionMode: '[M+Na]+', pathway: '嘧啶代谢', unit: 'μmol/L', refMin: 2.0, refMax: 8.0, significance: '核酸碱基代谢产物，水平异常与叶酸缺乏、肿瘤代谢重编程相关 (Wishart DS et al., HMDB 5.0, 2022)' },
    { id: 'S_BAIB', name: '(S)-β-氨基异丁酸', enName: '(S)-beta-Aminoisobutyric acid', category: 'amino_acid', mz: 103.9375, hmdb: 'HMDB0002166', ionMode: '[M+H]+', pathway: '胸腺嘧啶分解代谢', unit: 'μmol/L', refMin: 0.5, refMax: 5.0, significance: '胸腺嘧啶降解终产物，与运动耐量、线粒体功能相关，血浆水平升高见于高强度运动后 (Suhre K et al., Nat Genet 2011)' },
    { id: 'R_3HB', name: '(R)-3-羟基丁酸', enName: '(R)-3-Hydroxybutyric acid', category: 'organic_acid', mz: 104.9725, hmdb: 'HMDB0000011', ionMode: '[M+Na]+', pathway: '酮体代谢/脂肪酸β-氧化', unit: 'μmol/L', refMin: 10, refMax: 200, significance: '酮体主要成分，反映肝脏脂肪酸氧化活性。升高见于饥饿、生酮饮食、糖尿病酮症；降低见于糖代谢异常 (Newman JC & Verdin E, Cell Metab 2017)' },
    { id: 'L_SERINE', name: 'L-丝氨酸', enName: 'L-Serine', category: 'amino_acid', mz: 105.8725, hmdb: 'HMDB0000187', ionMode: '[M+H]+', pathway: '一碳代谢/甘氨酸-丝氨酸代谢', unit: 'μmol/L', refMin: 70, refMax: 190, significance: '参与一碳单位转移、神经递质合成。水平异常与神经退行性疾病、肿瘤增殖相关 (Mattaini KR et al., Science 2016)' },
    { id: 'GUANIDOACETATE', name: '胍基乙酸', enName: 'Guanidoacetic acid', category: 'nitrogen', mz: 118.0225, hmdb: 'HMDB0000128', ionMode: '[M+H]+', pathway: '肌酸生物合成', unit: 'μmol/L', refMin: 1.0, refMax: 5.0, significance: '肌酸合成前体，反映甘氨酸-精氨酸代谢和S-腺苷甲硫氨酸依赖的甲基化通路活性 (Brosnan JT & Brosnan ME, Annu Rev Nutr 2007)' },
    { id: '3_HIVA', name: '3-羟基异戊酸', enName: '3-Hydroxyisovaleric acid', category: 'organic_acid', mz: 119.0125, hmdb: 'HMDB0000754', ionMode: '[M+H]+', pathway: '亮氨酸分解代谢/生物素代谢', unit: 'μmol/L', refMin: 0.5, refMax: 10, significance: '亮氨酸降解产物。尿中升高为生物素缺乏标志物，也见于多种羧化酶缺乏症 (Mock DM et al., J Nutr 2002)' },
    { id: 'L_HOMOSERINE', name: 'L-高丝氨酸', enName: 'L-Homoserine', category: 'amino_acid', mz: 119.9575, hmdb: 'HMDB0000719', ionMode: '[M+H]+', pathway: '天冬氨酸族氨基酸合成', unit: 'μmol/L', refMin: 0.1, refMax: 2.0, significance: '苏氨酸和甲硫氨酸合成中间体。水平变化见于肝脏代谢紊乱和氨基酸转运障碍' },
    { id: 'L_CYSTEINE_H', name: 'L-半胱氨酸', enName: 'L-Cysteine', category: 'sulfur', mz: 121.9375, hmdb: 'HMDB0000574', ionMode: '[M+H]+', pathway: '含硫氨基酸代谢/谷胱甘肽合成', unit: 'μmol/L', refMin: 150, refMax: 350, significance: '谷胱甘肽前体，抗氧化防御核心底物。水平降低与氧化应激、免疫功能受损相关 (Jones DP, Annu Rev Pharmacol Toxicol 2006)' },
    { id: 'PIPECOLIC_ACID', name: '哌啶羧酸', enName: 'Pipecolic acid', category: 'amino_acid', mz: 129.8575, hmdb: 'HMDB0000070', ionMode: '[M+H]+', pathway: '赖氨酸降解', unit: 'μmol/L', refMin: 0.1, refMax: 2.0, significance: '赖氨酸代谢产物。升高见于Zellweger综合征和过氧化物酶体功能障碍，血浆水平>3.5 μmol/L提示遗传代谢病 (Peduto A et al., Mol Genet Metab 2004)' },
    { id: 'HYPOTAURINE', name: '次牛磺酸', enName: 'Hypotaurine', category: 'sulfur', mz: 131.9725, hmdb: 'HMDB0000965', ionMode: '[M+Na]+', pathway: '牛磺酸-次牛磺酸代谢', unit: 'μmol/L', refMin: 0.5, refMax: 5.0, significance: '抗氧化剂，清除羟基自由基和次氯酸。组织浓度反映氧化应激防御水平 (Aruoma OI et al., Chem Biol Interact 1988)' },
    { id: 'CREATININE', name: '肌酐', enName: 'Creatinine', category: 'nitrogen', mz: 136.0225, hmdb: 'HMDB0000562', ionMode: '[M+Na]+', pathway: '肌酸-肌酐转化', unit: 'μmol/L', refMin: 44, refMax: 133, significance: '肌肉代谢终产物，临床最常用的肾功能标志物(eGFR)。血浆水平升高>1.2 mg/dL提示肾小球滤过下降 (Levey AS et al., Ann Intern Med 2009)' },
    { id: 'PHENYLACETIC_ACID', name: '苯乙酸', enName: 'Phenylacetic acid', category: 'organic_acid', mz: 136.9675, hmdb: 'HMDB0000209', ionMode: '[M+H]+', pathway: '苯丙氨酸代谢', unit: 'μmol/L', refMin: 0.1, refMax: 2.0, significance: '苯丙氨酸肠道菌群代谢产物。升高见于苯丙酮尿症(PKU)和肝功能障碍，作为氮清除剂临床用于高氨血症治疗' },
    { id: 'L_CYSTEINE_Na', name: 'L-半胱氨酸', enName: 'L-Cysteine', category: 'sulfur', mz: 143.9875, hmdb: 'HMDB0000574', ionMode: '[M+Na]+', pathway: '含硫氨基酸代谢/谷胱甘肽合成', unit: 'μmol/L', refMin: 150, refMax: 350, significance: '钠加合物。谷胱甘肽前体，在氧化应激条件下消耗增加。与心血管疾病风险和炎症状态相关 (El-Khairy L et al., Circulation 2001)' },
    { id: 'ERYTHRITOL', name: '赤藓糖醇', enName: 'Erythritol', category: 'carbohydrate', mz: 144.9775, hmdb: 'HMDB0002994', ionMode: '[M+Na]+', pathway: '多元醇代谢/磷酸戊糖途径', unit: 'μmol/L', refMin: 1.0, refMax: 5.0, significance: '内源性合成的糖醇。近年研究发现其血浆水平升高与心血管事件(MACE)风险增加独立相关 (Witkowski M et al., Nat Med 2023)' },
    { id: 'PICOLINIC_ACID', name: '吡啶甲酸', enName: 'Picolinic acid', category: 'organic_acid', mz: 145.9225, hmdb: 'HMDB0002243', ionMode: '[M+Na]+', pathway: '色氨酸-犬尿氨酸代谢', unit: 'μmol/L', refMin: 0.1, refMax: 1.0, significance: '色氨酸代谢分支产物，具有锌螯合和免疫调节活性。水平异常反映色氨酸代谢通路紊乱 (Grant RS et al., Int J Tryptophan Res 2009)' },
    { id: 'TAURINE', name: '牛磺酸', enName: 'Taurine', category: 'sulfur', mz: 147.8575, hmdb: 'HMDB0000251', ionMode: '[M+Na]+', pathway: '牛磺酸-次牛磺酸代谢/胆汁酸结合', unit: 'μmol/L', refMin: 40, refMax: 100, significance: '条件必需氨基酸，心血管保护、抗氧化、胆汁酸结合。缺乏与心肌病、视网膜变性相关；补充有益于代谢综合征 (Yamori Y et al., J Biomed Sci 2010)' },
    { id: 'PYROGLUTAMIC_ACID', name: '吡咯谷氨酸', enName: 'Pyroglutamic acid', category: 'amino_acid', mz: 151.7725, hmdb: 'HMDB0000267', ionMode: '[M+Na]+', pathway: '谷胱甘肽循环/γ-谷氨酰循环', unit: 'μmol/L', refMin: 10, refMax: 50, significance: '谷胱甘肽代谢循环中间体。升高提示谷胱甘肽耗竭和氧化应激状态；5-氧代脯氨酸尿症提示谷胱甘肽合成酶缺乏 (Ristoff E & Larsson A, J Inherit Metab Dis 2007)' },
    { id: 'CITRACONIC_ACID', name: '顺丁烯二酸', enName: 'Citraconic acid', category: 'organic_acid', mz: 152.6275, hmdb: 'HMDB0000634', ionMode: '[M+Na]+', pathway: '支链氨基酸降解/衣康酸代谢', unit: 'μmol/L', refMin: 0.1, refMax: 1.0, significance: '衣康酸异构体，与巨噬细胞免疫应答和TCA循环重编程相关。衣康酸通路是炎症代谢调控关键节点 (ONeill LAJ & Artyomov MN, Nat Rev Immunol 2019)' },
    { id: 'MALIC_ACID', name: '苹果酸', enName: 'Malic acid', category: 'organic_acid', mz: 157.9375, hmdb: 'HMDB0000156', ionMode: '[M+Na]+', pathway: 'TCA循环/苹果酸-天冬氨酸穿梭', unit: 'μmol/L', refMin: 1.0, refMax: 8.0, significance: 'TCA循环中间体，连接线粒体与胞质代谢。水平反映线粒体功能和氧化磷酸化效率 (Martínez-Reyes I & Chandel NS, Nat Rev Cancer 2020)' },
    { id: 'TYRAMINE', name: '酪胺', enName: 'Tyramine', category: 'amino_acid', mz: 159.9625, hmdb: 'HMDB0000306', ionMode: '[M+Na]+', pathway: '酪氨酸代谢', unit: 'μmol/L', refMin: 0.1, refMax: 2.0, significance: '痕量胺类神经递质，由酪氨酸脱羧产生。参与血压调节和神经传递，升高与MAO抑制剂使用和肠道菌群失调相关 (Broadley KJ, Pharmacol Ther 2010)' },
    { id: 'ISONICOTINIC_ACID', name: '异烟酸', enName: 'Isonicotinic acid', category: 'xenobiotic', mz: 161.9425, hmdb: 'HMDB0060665', ionMode: '[M+K]+', pathway: '烟酸-烟酰胺代谢', unit: 'μmol/L', refMin: 0.1, refMax: 1.0, significance: '烟酸代谢产物，与NAD+生物合成通路相关。NAD+水平下降是衰老和代谢疾病的共同特征 (Rajman L et al., Cell Metab 2018)' },
    { id: 'O_PEA', name: 'O-磷酸乙醇胺', enName: 'O-Phosphoethanolamine', category: 'amino_acid', mz: 163.9675, hmdb: 'HMDB0000224', ionMode: '[M+Na]+', pathway: '磷脂生物合成/Kennedy通路', unit: 'μmol/L', refMin: 1.0, refMax: 10, significance: '磷脂酰乙醇胺前体，反映肝磷脂合成活性。水平异常与肝脂肪变性、脂代谢紊乱相关 (Vance JE, J Lipid Res 2015)' },
    { id: 'L_GLUTAMINE', name: 'L-谷氨酰胺', enName: 'L-Glutamine', category: 'amino_acid', mz: 185.5675, hmdb: 'HMDB0000641', ionMode: '[M+K]+', pathway: '谷氨酰胺-谷氨酸代谢', unit: 'μmol/L', refMin: 420, refMax: 730, significance: '最丰富的循环氨基酸，氮转运载体、免疫细胞燃料、核苷酸前体。消耗增加见于严重创伤和肿瘤恶液质 (Cruzat V et al., Nutrients 2018)' },
    { id: 'SALICYLURIC_ACID', name: '水杨尿酸', enName: 'Salicyluric acid', category: 'xenobiotic', mz: 195.7825, hmdb: 'HMDB0000840', ionMode: '[M+H]+', pathway: 'Ⅱ相代谢/甘氨酸结合反应', unit: 'μmol/L', refMin: 0.1, refMax: 5.0, significance: '水杨酸-甘氨酸结合产物，反映肝脏Ⅱ相解毒功能。阿司匹林代谢标志物，水平受肝脏UGT和甘氨酸可用性影响 (Hutt AJ et al., Drug Metab Rev 1990)' },
    { id: 'D_GLUCOSE_Na', name: 'D-葡萄糖', enName: 'D-Glucose', category: 'carbohydrate', mz: 203.0725, hmdb: 'HMDB0000122', ionMode: '[M+Na]+', pathway: '糖酵解/糖异生', unit: 'mmol/L', refMin: 3.9, refMax: 6.1, significance: '核心能量底物。循环水平受胰岛素-胰高血糖素轴调控，持续升高是糖尿病诊断标准和代谢综合征核心指标 (American Diabetes Association, Diabetes Care 2023)' },
    { id: 'D_GLUCOSE_K', name: 'D-葡萄糖', enName: 'D-Glucose', category: 'carbohydrate', mz: 218.9125, hmdb: 'HMDB0000122', ionMode: '[M+K]+', pathway: '糖酵解/糖异生', unit: 'mmol/L', refMin: 3.9, refMax: 6.1, significance: '钾加合物。核心能量底物，血糖稳态失调是代谢综合征和2型糖尿病的根本特征 (DeFronzo RA, Diabetes Care 2021)' }
];

export const categoryNames = {
    amino_acid: '氨基酸代谢',
    carbohydrate: '碳水化合物代谢',
    organic_acid: '有机酸与TCA循环',
    sulfur: '含硫化合物代谢',
    nitrogen: '含氮化合物与核苷酸代谢',
    xenobiotic: '外源物与药物代谢'
};

export const subtypes = {
    sedentary: {
        name: '运动不足型',
        description: '能量代谢相关指标异常，提示缺乏规律运动',
        indicators: ['Lactate', 'Pyruvate', 'Ketone', 'Acetylcarnitine'],
        diet: [
            '增加优质蛋白质摄入：鸡肉、鱼肉、鸡蛋、豆腐、希腊酸奶',
            '适量补充B族维生素：全麦面包、燕麦、菠菜、西兰花、香蕉',
            '控制精制糖摄入：避免蛋糕、糖果、甜饮料',
            '多吃富含铁的食物：瘦肉、动物肝脏、菠菜、红枣',
            '食谱示例：早餐(燕麦粥+鸡蛋+蓝莓)、午餐(鸡胸肉沙拉)、晚餐(清蒸鱼+糙米+蔬菜)'
        ],
        lifestyle: [
            '作息时间：建议22:30前入睡，7:00起床，保证7-8小时睡眠',
            '避免久坐：每小时起身活动5-10分钟，可进行伸展运动',
            '规律作息：保持固定的睡眠和起床时间，包括周末',
            '减少熬夜：避免23:00后使用电子设备，睡前1小时放松',
            '压力管理：每天进行10-15分钟冥想或深呼吸练习',
            '工作休息：每工作1小时休息5分钟，避免连续工作超过2小时'
        ],
        exercise: [
            '每周至少150分钟中等强度运动：快走、慢跑、游泳、骑自行车',
            '力量训练：每周2-3次，每次20-30分钟，包括深蹲、俯卧撑、哑铃训练',
            '日常活动：每天步行8000-10000步，每小时起身活动5-10分钟',
            '运动强度：心率保持在最大心率的60-70%（最大心率=220-年龄）',
            '运动计划：周一、三、五进行有氧运动30分钟，周二、四进行力量训练20分钟'
        ],
        recommendations: [
            '建议每周进行至少150分钟中等强度有氧运动',
            '增加日常活动量，如步行、爬楼梯等',
            '结合抗阻训练，每周2-3次',
            '避免久坐，每小时起身活动5-10分钟',
            '循序渐进，从低强度运动开始'
        ],
        diseases: [
            { name: '代谢综合征', symptoms: '腹部肥胖、血压升高、血糖异常、血脂异常' },
            { name: '2型糖尿病', symptoms: '多饮、多尿、多食、体重下降、疲劳乏力' },
            { name: '心血管疾病', symptoms: '胸闷、心悸、气短、运动耐量下降' }
        ]
    },
    obese: {
        name: '肥胖代谢紊乱型',
        description: '脂质代谢异常，与体重管理相关',
        indicators: ['LDL_C', 'TG', 'TC', 'ApoB', 'HDL_C'],
        diet: [
            '🚫 限制高脂肪食物：油炸食品、肥肉、奶油',
            '🚫 避免高糖饮料：碳酸饮料、奶茶、果汁',
            '增加蔬菜水果摄入：每天5份以上，如菠菜、西兰花、苹果、蓝莓',
            '选择全谷物食品：燕麦、糙米、全麦面包',
            '控制总热量摄入：每日减少300-500大卡',
            '食谱示例：早餐(蔬菜蛋卷+全麦吐司)、午餐( grilled chicken salad)、晚餐(清蒸鱼+糙米饭+凉拌菜)'
        ],
        lifestyle: [
            '作息时间：建议22:00前入睡，6:30起床，保证7-8小时睡眠',
            '避免熬夜：晚上10点后避免进食，避免使用电子设备',
            '压力管理：每天进行15-20分钟冥想或瑜伽，避免情绪性进食',
            '定期监测：每周固定时间测量体重和腰围，记录变化',
            '睡眠质量：保持卧室安静、黑暗，温度控制在18-20℃',
            '进餐规律：固定三餐时间，避免暴饮暴食和夜间进食'
        ],
        exercise: [
            '每周300分钟中等强度运动：快走、游泳、骑自行车、椭圆机',
            '力量训练：每周3-4次，每次30分钟，包括深蹲、卧推、引体向上',
            '日常活动：每天步行10000-12000步，减少久坐时间',
            '运动强度：心率保持在最大心率的60-75%（最大心率=220-年龄）',
            '运动计划：周一、三、五进行有氧运动45分钟，周二、四、六进行力量训练30分钟'
        ],
        recommendations: [
            '控制总热量摄入，创造适度热量缺口',
            '减少饱和脂肪和反式脂肪摄入',
            '增加膳食纤维摄入，多吃蔬菜水果',
            '限制精制碳水化合物和含糖饮料',
            '定期监测体重和腰围变化',
            '必要时寻求专业营养师指导'
        ],
        diseases: [
            { name: '动脉粥样硬化', symptoms: '头晕、胸闷、肢体麻木、记忆力下降' },
            { name: '冠心病', symptoms: '胸痛、胸闷、气短、心悸、出汗' },
            { name: '脂肪肝', symptoms: '右上腹不适、乏力、食欲减退' },
            { name: '高血压', symptoms: '头痛、头晕、耳鸣、心悸、视力模糊' }
        ]
    },
    inflammatory: {
        name: '炎症饮食相关型',
        description: '炎症标志物升高，可能与饮食结构有关',
        indicators: ['CRP', 'IL6', 'TNF_alpha', 'Homocysteine'],
        diet: [
            '🚫 避免加工食品：薯片、快餐、腌制食品',
            '🚫 减少红肉摄入：每周不超过500g',
            '增加Omega-3脂肪酸：三文鱼、鳕鱼、亚麻籽、核桃',
            '多吃抗氧化食物：蓝莓、草莓、菠菜、西兰花、绿茶',
            '采用地中海饮食：橄榄油、坚果、全谷物、新鲜蔬果',
            '食谱示例：早餐(希腊酸奶+蓝莓+亚麻籽)、午餐(地中海沙拉)、晚餐(烤三文鱼+糙米+蔬菜)'
        ],
        lifestyle: [
            '作息时间：建议22:30前入睡，7:00起床，保证7-8小时睡眠',
            '戒烟限酒：完全戒烟，限制酒精摄入（男性每日不超过25g，女性不超过15g）',
            '压力管理：每天进行20分钟冥想或深呼吸练习，每周进行1-2次瑜伽',
            '环境优化：避免暴露在污染环境中，保持室内空气流通',
            '睡眠质量：睡前避免咖啡因和电子设备，创造良好的睡眠环境',
            '情绪管理：培养兴趣爱好，与朋友家人保持良好沟通'
        ],
        exercise: [
            '适度有氧运动：每周150-200分钟，如快走、游泳、瑜伽',
            '压力缓解运动：每周2-3次瑜伽或太极，每次30分钟',
            '运动强度：心率保持在最大心率的50-65%（最大心率=220-年龄）',
            '避免过度运动：避免高强度训练，注重恢复',
            '运动计划：周一、三、五进行有氧运动30分钟，周二、四进行瑜伽或太极30分钟'
        ],
        recommendations: [
            '采用地中海饮食模式',
            '增加Omega-3脂肪酸摄入（深海鱼、坚果）',
            '多吃富含抗氧化物质的食物',
            '减少加工食品和高糖食品摄入',
            '戒烟限酒',
            '保证充足睡眠，管理压力'
        ],
        diseases: [
            { name: '动脉粥样硬化', symptoms: '血管炎症、斑块形成、血流受阻' },
            { name: '自身免疫性疾病', symptoms: '关节肿痛、皮疹、疲劳、发热' },
            { name: '心血管疾病', symptoms: '胸痛、气短、心悸、水肿' }
        ]
    },
    glucose: {
        name: '糖代谢异常型',
        description: '葡萄糖相关代谢物异常，提示糖代谢问题',
        indicators: ['Glucose', 'HbA1c', 'Insulin', 'HOMA_IR'],
        diet: [
            '🚫 限制精制碳水化合物：白面包、白米饭、糕点',
            '🚫 避免含糖饮料：汽水、果汁、奶茶',
            '选择低升糖指数食物：燕麦、豆类、非淀粉类蔬菜',
            '增加膳食纤维：蔬菜、水果、全谷物',
            '控制餐后血糖：少量多餐，避免暴饮暴食',
            '食谱示例：早餐(燕麦粥+鸡蛋)、午餐(鸡肉+蔬菜+糙米)、晚餐(豆腐+蔬菜+全麦意面)'
        ],
        lifestyle: [
            '进餐时间：固定三餐时间，早餐7:30-8:30，午餐11:30-12:30，晚餐18:00-19:00',
            '避免暴饮暴食：控制每餐食量，采用小碗盛装，细嚼慢咽',
            '体重管理：每周监测体重，目标是将BMI控制在18.5-24之间',
            '血糖监测：每周测量2-3次空腹血糖，每3个月测量一次糖化血红蛋白',
            '作息规律：建议22:30前入睡，7:00起床，保证7-8小时睡眠',
            '压力管理：每天进行15分钟冥想，避免长期处于高压状态'
        ],
        exercise: [
            '餐后30分钟运动：散步、轻度有氧运动，帮助控制血糖',
            '有氧运动：每周150-200分钟，如快走、游泳、骑自行车',
            '抗阻训练：每周2-3次，每次20-30分钟，增强肌肉代谢',
            '运动强度：心率保持在最大心率的50-70%（最大心率=220-年龄）',
            '运动计划：早餐后散步10分钟，午餐后散步15分钟，晚餐后散步15分钟，每周3次力量训练'
        ],
        recommendations: [
            '控制碳水化合物摄入总量',
            '选择低升糖指数食物',
            '增加膳食纤维摄入',
            '规律进餐，避免暴饮暴食',
            '餐后适度活动有助于血糖控制',
            '定期监测空腹和餐后血糖'
        ],
        diseases: [
            { name: '2型糖尿病', symptoms: '多饮多尿、体重下降、视力模糊、伤口愈合慢' },
            { name: '糖尿病并发症', symptoms: '手脚麻木、视力下降、蛋白尿、皮肤瘙痒' },
            { name: '代谢综合征', symptoms: '腹型肥胖、高血压、高血糖、高血脂' }
        ]
    },
    amino: {
        name: '氨基酸代谢紊乱型',
        description: '支链氨基酸等异常，与蛋白质代谢相关',
        indicators: ['Leucine', 'Isoleucine', 'Valine', 'BCAA', 'Phenylalanine', 'Tyrosine'],
        diet: [
            '优化蛋白质来源：鱼肉、鸡肉、鸡蛋、豆腐、乳制品',
            '适量摄入优质蛋白：每公斤体重0.8-1.0g',
            '🚫 避免过量红肉：每周不超过300g',
            '增加植物蛋白：豆类、坚果、藜麦',
            '补充维生素B6：香蕉、土豆、鸡肉、鱼类',
            '食谱示例：早餐(希腊酸奶+坚果)、午餐(烤鸡+蔬菜)、晚餐(豆腐汤+糙米)' 
        ],
        lifestyle: [
            '作息时间：建议22:30前入睡，7:00起床，保证7-8小时睡眠',
            '避免过度劳累：工作时间控制在8小时以内，避免熬夜和高强度工作',
            '情绪管理：保持情绪稳定，避免长期处于紧张状态',
            '定期体检：每6个月进行一次肝肾功能检查，监测氨基酸代谢指标',
            '休息充足：保证每天有足够的休息时间，避免连续工作超过5天',
            '水分摄入：每天饮水量保持在1500-2000ml，促进代谢废物排出'
        ],
        exercise: [
            '适度运动：每周150-180分钟，如快走、游泳、瑜伽',
            '力量训练：每周2-3次，每次20-25分钟，避免过度训练',
            '运动恢复：保证充足休息，运动后拉伸和放松',
            '补充水分：运动前后充分补水，保持身体水分平衡',
            '运动计划：周一、三、五进行轻度有氧运动30分钟，周二、四进行轻度力量训练20分钟'
        ],
        recommendations: [
            '优化蛋白质摄入结构，选择优质蛋白',
            '适量摄入乳制品、鱼类、豆类',
            '避免过量摄入红肉',
            '保持均衡饮食，避免单一食物过量',
            '关注肝肾功能健康',
            '必要时进行蛋白质代谢相关检查'
        ],
        diseases: [
            { name: '肝脏疾病', symptoms: '乏力、食欲减退、腹胀、黄疸' },
            { name: '肾脏疾病', symptoms: '水肿、尿量改变、腰痛、高血压' },
            { name: '代谢性疾病', symptoms: '发育迟缓、智力障碍、特殊体味' }
        ]
    }
};

export var LANGUAGES = {
    'zh-CN': {
        'app.title': 'MetaScan健康管理平台',
        'nav.home': '首页',
        'nav.data': '数据',
        'nav.chat': '沟通',
        'nav.reports': '报告',
        'nav.profile': '我的',
        'nav.search': '搜索',
        'nav.dashboard': '仪表盘',
        'nav.patients': '患者管理',
        'login.title': 'MetaScan 智能健康管理平台',
        'login.subtitle': '精准代谢分析 · 科学健康管理',
        'login.username': '用户名',
        'login.password': '密码',
        'login.role.patient': '患者',
        'login.role.doctor': '医生',
        'login.btn': '登 录',
        'login.register': '还没有账号？立即注册',
        'login.guest': '游客体验',
        'register.title': '注册新账号',
        'register.role': '角色',
        'register.btn': '注 册',
        'register.back': '已有账号？返回登录',
        'quick.weight': '记录体重',
        'quick.exercise': '记录运动',
        'quick.diet': '记录饮食',
        'quick.water': '记录饮水',
        'quick.sleep': '记录睡眠',
        'quick.mood': '记录心情',
        'home.achievements': '成就中心',
        'home.achievements.desc': '坚持记录，解锁更多成就',
        'home.dashboard': '数据仪表盘',
        'home.quickRecord': '快速记录中心',
        'home.analysis': '数据分析与洞察',
        'home.empty.chart': '还没有健康数据',
        'home.empty.chartDesc': '记录后即可查看详细趋势分析',
        'home.empty.addWeight': '添加第一条体重记录',
        'home.empty.addExercise': '添加第一条运动记录',
        'home.empty.addDiet': '添加第一条饮食记录',
        'data.metabolic': '代谢录入',
        'data.history': '历史对比',
        'chat.title': '医患沟通',
        'chat.noDoctor': '选择医生',
        'chat.input': '请输入您的消息...',
        'chat.send': '发送',
        'reports.title': '健康报告',
        'reports.empty': '暂无报告数据',
        'reports.emptyDesc': '请先在"数据"页面录入数据并生成报告',
        'profile.settings': '个人设置',
        'profile.notifications': '通知中心',
        'profile.about': '关于系统',
        'profile.logout': '退出登录',
        'profile.quickActions': '快捷操作',
        'profile.language': '语言设置',
        'profile.contrast': '高对比度模式',
        'profile.darkMode': '深色模式',
        'save': '保存',
        'cancel': '取消',
        'confirm': '确认',
        'search.placeholder': '搜索指标、医嘱、医生、日期...',
        'search.cancel': '取消',
        'search.noResults': '未找到相关结果',
        'notification.saved': '记录已保存',
        'notification.sent': '发送成功',
        'logout.confirm': '确认退出登录',
    },
    'en': {
        'app.title': 'MetaScan Health Platform',
        'nav.home': 'Home',
        'nav.data': 'Data',
        'nav.chat': 'Chat',
        'nav.reports': 'Reports',
        'nav.profile': 'Me',
        'nav.search': 'Search',
        'nav.dashboard': 'Dashboard',
        'nav.patients': 'Patients',
        'login.title': 'MetaScan Smart Health Platform',
        'login.subtitle': 'Precision Metabolic Analysis · Scientific Health Management',
        'login.username': 'Username',
        'login.password': 'Password',
        'login.role.patient': 'Patient',
        'login.role.doctor': 'Doctor',
        'login.btn': 'Login',
        'login.register': 'No account? Register now',
        'login.guest': 'Guest Experience',
        'register.title': 'Create Account',
        'register.role': 'Role',
        'register.btn': 'Register',
        'register.back': 'Already have an account? Back to Login',
        'quick.weight': 'Log Weight',
        'quick.exercise': 'Log Exercise',
        'quick.diet': 'Log Diet',
        'quick.water': 'Log Water',
        'quick.sleep': 'Log Sleep',
        'quick.mood': 'Log Mood',
        'home.achievements': 'Achievements',
        'home.achievements.desc': 'Keep tracking to unlock more achievements',
        'home.dashboard': 'Dashboard',
        'home.quickRecord': 'Quick Record',
        'home.analysis': 'Data Analysis & Insights',
        'home.empty.chart': 'No Health Data Yet',
        'home.empty.chartDesc': 'Start logging to view detailed trend analysis',
        'home.empty.addWeight': 'Add First Weight Record',
        'home.empty.addExercise': 'Add First Exercise Record',
        'home.empty.addDiet': 'Add First Diet Record',
        'data.metabolic': 'Metabolic Entry',
        'data.history': 'History',
        'chat.title': 'Doctor-Patient Chat',
        'chat.noDoctor': 'Select Doctor',
        'chat.input': 'Type your message...',
        'chat.send': 'Send',
        'reports.title': 'Health Reports',
        'reports.empty': 'No Report Data',
        'reports.emptyDesc': 'Enter data in the "Data" page to generate a report',
        'profile.settings': 'Settings',
        'profile.notifications': 'Notifications',
        'profile.about': 'About',
        'profile.logout': 'Log Out',
        'profile.quickActions': 'Quick Actions',
        'profile.language': 'Language',
        'profile.contrast': 'High Contrast Mode',
        'profile.darkMode': 'Dark Mode',
        'save': 'Save',
        'cancel': 'Cancel',
        'confirm': 'Confirm',
        'search.placeholder': 'Search indicators, prescriptions, doctors, dates...',
        'search.cancel': 'Cancel',
        'search.noResults': 'No results found',
        'notification.saved': 'Record saved',
        'notification.sent': 'Sent successfully',
        'logout.confirm': 'Confirm logout',
    }
};