export interface ContractData {
  // Employee
  name_en: string; name_ar?: string;
  nationality?: string; dob?: string;
  id_number?: string; id_type?: string; id_expiry?: string;
  gender?: string; religion?: string; marital_status?: string;
  email: string; mobile?: string;
  iban?: string; bank_name?: string;
  education?: string; speciality?: string;
  employee_number?: string;
  // Role
  position_title_en: string; position_title_ar?: string;
  ssco_code?: string; ssco_title_en?: string; ssco_title_ar?: string;
  department?: string;
  // Contract
  start_date: string; end_date: string; joining_date?: string;
  basic_salary_sar: number;
  housing_allowance_sar?: number;
  transport_allowance_sar?: number;
  total_monthly_sar?: number;
  probation_days?: number;
  non_compete_scope?: string;
  termination_compensation_sar?: number;
  contract_date?: string;
}

function fmt(d?: string | null) {
  if (!d) return "XXXXX";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return d; }
}
function fmtAr(d?: string | null) {
  if (!d) return "XXXXX";
  try { return new Date(d).toLocaleDateString("ar-SA-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return d; }
}
function sar(n?: number | null) { return n != null ? n.toLocaleString("en-SA") + " SAR" : "XXXXX SAR"; }

export function generateContractHTML(data: ContractData): string {
  const {
    name_en, name_ar, nationality, dob, id_number, id_type, id_expiry,
    gender, religion, marital_status, email, mobile, iban, bank_name,
    education, speciality, employee_number,
    position_title_en, position_title_ar,
    ssco_code, ssco_title_en, ssco_title_ar,
    start_date, end_date, joining_date,
    basic_salary_sar, housing_allowance_sar = 0, transport_allowance_sar = 0,
    termination_compensation_sar, non_compete_scope, probation_days = 90,
    contract_date,
  } = data;

  const total = data.total_monthly_sar ?? (basic_salary_sar + housing_allowance_sar + transport_allowance_sar);
  const today = contract_date || new Date().toISOString().slice(0, 10);

  const ROW = (en: string, ar: string, highlight = false) => `
    <tr>
      <td class="cell${highlight ? " hl" : ""}">${en}</td>
      <td class="cell rtl${highlight ? " hl" : ""}">${ar}</td>
    </tr>`;

  const SECTION = (num: string, enTitle: string, arTitle: string, enBody: string, arBody: string) => `
    <tr><td class="sec-head">${num}. ${enTitle}</td><td class="sec-head rtl">${num === "٩" ? "" : ""}${arTitle} .${num}</td></tr>
    <tr><td class="body-cell">${enBody}</td><td class="body-cell rtl">${arBody}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Employment Contract — ${name_en}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #1a1a1a; background: #fff; padding: 30px 40px; max-width: 960px; margin: 0 auto; }
@media print { body { padding: 15px 20px; } .no-print { display: none !important; } @page { size: A4; margin: 15mm; } }
.print-bar { background: #0a1628; color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 24px; display: flex; gap: 12px; }
.print-bar button { padding: 8px 18px; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-print { background: #e8c97a; color: #0a1628; }
.btn-close { background: rgba(255,255,255,0.15); color: white; }
.contract-header { text-align: center; border: 2px solid #1a3a5c; padding: 18px 0 12px; margin-bottom: 20px; }
.co-logo { font-size: 22pt; font-weight: 900; color: #0a1628; letter-spacing: 0.05em; }
.co-logo-ar { font-family: 'Noto Naskh Arabic', serif; font-size: 16pt; color: #0a1628; direction: rtl; }
.contract-title { font-size: 16pt; font-weight: 700; color: #1a3a5c; margin-top: 10px; letter-spacing: 0.08em; }
.contract-title-ar { font-family: 'Noto Naskh Arabic', serif; font-size: 14pt; color: #1a3a5c; direction: rtl; }
.notice { background: #fffbeb; border: 1px solid #fde68a; padding: 10px 14px; font-size: 9.5pt; color: #78350f; margin-bottom: 16px; border-radius: 4px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
.party-head { background: #1a3a5c; color: white; font-weight: 700; font-size: 11pt; padding: 8px 12px; }
.rtl { font-family: 'Noto Naskh Arabic', serif; direction: rtl; text-align: right; }
.cell { border: 1px solid #b0bec5; padding: 6px 10px; font-size: 10.5pt; vertical-align: top; width: 50%; }
.hl { background: #fffde7; }
.sec-head { background: #2c5282; color: white; font-weight: 700; padding: 7px 12px; font-size: 11pt; width: 50%; border: 1px solid #1a3a5c; }
.body-cell { border: 1px solid #b0bec5; padding: 10px 14px; font-size: 10.5pt; vertical-align: top; width: 50%; line-height: 1.7; }
.sig-table { margin-top: 30px; }
.sig-cell { width: 50%; border: 1px solid #b0bec5; padding: 20px 14px; vertical-align: top; }
.sig-line { border-top: 1.5px solid #1a3a5c; margin-top: 40px; padding-top: 6px; font-size: 10pt; color: #475569; }
.footer { text-align: center; font-size: 9pt; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
.warn { background: #fef2f2; border: 1.5px solid #fca5a5; padding: 10px 14px; color: #dc2626; font-size: 10pt; margin-bottom: 14px; border-radius: 4px; font-weight: 600; }
</style>
</head>
<body>
<div class="no-print print-bar">
  <button class="btn-print" onclick="window.print()">🖨 Print Contract / طباعة العقد</button>
  <button class="btn-close" onclick="window.close()">✕ Close</button>
  <span style="margin-left:auto;font-size:12px;opacity:0.7">Generated by THINK-AI People Hub · ${new Date().toLocaleDateString()}</span>
</div>

${(ssco_code === "1212" || ssco_code === "2423") ? `<div class="warn">⚠ COMPLIANCE WARNING: SSCO code ${ssco_code} is RESERVED for Saudi nationals under KSA Labour Law. A non-Saudi employee cannot hold this classification. Reclassify to executive tier (ISCO 1120) before authenticating on Qiwa.</div>` : ""}

<div class="notice"><strong>Operational aid only — not legal advice.</strong> The legally binding contract is generated and authenticated on the Qiwa platform. Confirm SSCO code with KSA labour counsel before authentication.</div>

<div class="contract-header">
  <div class="co-logo">THINK AI</div>
  <div class="co-logo-ar">ثينك أي آي</div>
  <div class="contract-title">EMPLOYMENT CONTRACT</div>
  <div class="contract-title-ar">عقد عمل</div>
  <div style="font-size:10pt;color:#475569;margin-top:6px;">
    Created electronically — ${fmt(today)} &nbsp;|&nbsp; <span style="font-family:'Noto Naskh Arabic',serif;direction:rtl">أُبرم إلكترونياً — ${fmtAr(today)}</span>
  </div>
</div>

<table>
  <!-- First Party -->
  <tr><td class="party-head">First Party (Employer)</td><td class="party-head rtl">الطرف الأول (صاحب العمل)</td></tr>
  ${ROW("Company: THINK AI", "الشركة: ثينك أي آي")}
  ${ROW("National Unified Number: XXXXX", "الرقم الوطني الموحد: XXXXX", true)}
  ${ROW("Establishment Number: XXXXX", "رقم المنشأة: XXXXX", true)}
  ${ROW("Commercial Registration: XXXXX", "السجل التجاري: XXXXX", true)}
  ${ROW("Address: Riyadh, Kingdom of Saudi Arabia", "العنوان: الرياض، المملكة العربية السعودية")}
  ${ROW("Work Location: Riyadh, Kingdom of Saudi Arabia", "مكان العمل: الرياض، المملكة العربية السعودية")}
  ${ROW("Email: people@think-ai.com", "البريد الإلكتروني: people@think-ai.com")}
  ${ROW("Represented by: Ahmed Al-Helmy, People Lead", "ويمثلها بالتوقيع: أحمد الهلمي بصفته مسؤول تطوير الكوادر البشرية")}

  <!-- Second Party -->
  <tr><td class="party-head">Second Party (Employee)</td><td class="party-head rtl">الطرف الثاني (الموظف)</td></tr>
  ${ROW(`Name: ${name_en}`, `الاسم: ${name_ar || name_en}`, !name_ar)}
  ${ROW(`Profession / SSCO (as on Qiwa/Iqama): ${ssco_title_en || "XXXXX"} [${ssco_code || "XXXXX"}]`,
        `المهنة (حسب قوى/الإقامة): ${ssco_title_ar || "XXXXX"} [${ssco_code || "XXXXX"}]`,
        !ssco_title_en)}
  ${ROW(`Functional Job Title: ${position_title_en}`, `المسمى الوظيفي الفعلي: ${position_title_ar || position_title_en}`, !position_title_ar)}
  ${ROW(`Employee Number: ${employee_number || "XXXXX"}`, `الرقم الوظيفي: ${employee_number || "XXXXX"}`, !employee_number)}
  ${ROW(`Nationality: ${nationality || "XXXXX"}`, `الجنسية: ${nationality || "XXXXX"}`, !nationality)}
  ${ROW(`Date of Birth: ${fmt(dob)}`, `تاريخ الميلاد: ${fmt(dob)}`, !dob)}
  ${ROW(`Identity / Iqama Number: ${id_number || "XXXXX"}`, `رقم الهوية / الإقامة: ${id_number || "XXXXX"}`, !id_number)}
  ${ROW(`ID Type: ${id_type || "XXXXX"}`, `نوع الهوية: ${id_type || "XXXXX"}`, !id_type)}
  ${ROW(`ID Expiry Date: ${fmt(id_expiry)}`, `تاريخ الانتهاء: ${fmt(id_expiry)}`, !id_expiry)}
  ${ROW(`Gender: ${gender || "XXXXX"} &nbsp;&nbsp; Religion: ${religion || "XXXXX"}`, `الجنس: ${gender || "XXXXX"} &nbsp;&nbsp; الديانة: ${religion || "XXXXX"}`, !gender || !religion)}
  ${ROW(`Marital Status: ${marital_status || "XXXXX"}`, `الحالة الاجتماعية: ${marital_status || "XXXXX"}`, !marital_status)}
  ${ROW(`Education: ${education || "XXXXX"} &nbsp;&nbsp; Speciality: ${speciality || "XXXXX"}`, `المؤهل العلمي: ${education || "XXXXX"} &nbsp;&nbsp; التخصص: ${speciality || "XXXXX"}`, !education)}
  ${ROW(`IBAN: ${iban || "XXXXX"} &nbsp;&nbsp; Bank: ${bank_name || "XXXXX"}`, `رقم الآيبان: ${iban || "XXXXX"} &nbsp;&nbsp; اسم البنك: ${bank_name || "XXXXX"}`, !iban || !bank_name)}
  ${ROW(`Email: ${email} &nbsp;&nbsp; Mobile: ${mobile || "XXXXX"}`, `البريد الإلكتروني: ${email} &nbsp;&nbsp; رقم الجوال: ${mobile || "XXXXX"}`, !mobile)}

  <!-- Section 1 -->
  ${SECTION("1","Job & Duties","العمل والمهام",
    `The two parties agreed that the Second Party shall work for the First Party under its management and supervision in the position of <strong>${position_title_en}</strong>, performing the duties assigned in proportion to his/her practical, scientific and technical capabilities, in line with work requirements and without conflicting with the controls stipulated in Articles (58, 59, 60) of the Labor Law.`,
    `اتفق الطرفان على أن يعمل الطرف الثاني لدى الطرف الأول تحت إدارته وإشرافه بوظيفة <strong>${position_title_ar || position_title_en}</strong>، ومباشرة الأعمال التي يُكلَّف بها بما يتناسب مع قدراته العملية والعلمية والفنية وفقاً لاحتياجات العمل وبما لا يتعارض مع الضوابط المنصوص عليها في المواد (الثامنة والخمسون، التاسعة والخمسون، الستون) من نظام العمل.`
  )}

  <!-- Section 2 -->
  ${SECTION("2","Duration","مدة العقد",
    `The duration of this contract is one (1) year, starting from <strong>${fmt(start_date)}</strong> and ending on <strong>${fmt(end_date)}</strong>. The actual commencement (joining) date of the Second Party is <strong>${fmt(joining_date || start_date)}</strong>. This contract renews for a similar period unless either party notifies the other, in writing, of its unwillingness to renew sixty (60) days before the contract expires.`,
    `مدة هذا العقد سنة واحدة (١)، تبدأ من تاريخ <strong>${fmt(start_date)}</strong> وتنتهي في <strong>${fmt(end_date)}</strong>، علماً بأن تاريخ مباشرة الطرف الثاني للعمل هو <strong>${fmt(joining_date || start_date)}</strong>. ويتجدد هذا العقد لمدة أو لمدد مماثلة ما لم يُشعر أحد الطرفين الآخر خطياً بعدم رغبته في التجديد قبل ستين (٦٠) يوماً من تاريخ انتهاء العقد.`
  )}

  <!-- Section 3 -->
  ${SECTION("3","Probation","فترة التجربة",
    `The Second Party is subject to a probation period of <strong>${probation_days || 90} days</strong> from the commencement of work (extendable by written mutual agreement up to a total of 180 days), excluding Eid al-Fitr, Eid al-Adha and sick leave periods. Either party may terminate the contract during this period without compensation, unless the contract grants only one party that right.`,
    `يخضع الطرف الثاني لفترة تجربة مدتها <strong>${probation_days || 90} يوماً</strong> تبدأ من تاريخ مباشرته للعمل (قابلة للتمديد باتفاق كتابي مشترك بما لا يتجاوز ١٨٠ يوماً)، ولا يدخل في حسابها إجازة عيدي الفطر والأضحى والإجازة المرضية. ويكون لأي من الطرفين الحق في إنهاء العقد خلال هذه الفترة دون تعويض، ما لم ينص العقد على أحقية أحدهما في الإنهاء.`
  )}

  <!-- Section 4 -->
  ${SECTION("4","Working Hours & Overtime","ساعات العمل والعمل الإضافي",
    `Working time is set at forty-eight (48) hours per week (maximum 8 hours/day; reduced to 6 hours/day during Ramadan for Muslim employees). The First Party shall pay for overtime at the hourly wage plus fifty percent (50%) of the basic wage per Article 107 of the Saudi Labour Law.`,
    `تُحدد ساعات العمل بثماني وأربعين (٤٨) ساعة أسبوعياً (بحد أقصى ٨ ساعات يومياً، وتُخفَّض إلى ٦ ساعات يومياً خلال شهر رمضان للموظف المسلم). ويلتزم الطرف الأول بأن يدفع عن ساعات العمل الإضافية أجر الساعة مضافاً إليه ٥٠٪ من الأجر الأساسي وفقاً للمادة ١٠٧ من نظام العمل السعودي.`
  )}

  <!-- Section 5 -->
  ${SECTION("5","Wages","الأجر",
    `The First Party pays the Second Party a monthly wage of <strong>${sar(total)}</strong> (all-inclusive), due at the end of each month, comprising:<br>
     • Basic Wage: ${sar(basic_salary_sar)}<br>
     ${housing_allowance_sar ? `• Housing Allowance: ${sar(housing_allowance_sar)}<br>` : ""}
     ${transport_allowance_sar ? `• Transportation Allowance: ${sar(transport_allowance_sar)}<br>` : ""}
     Payment shall be via bank transfer to the employee's registered IBAN in compliance with the Wage Protection System (WPS).`,
    `يدفع الطرف الأول للطرف الثاني أجراً شهرياً إجمالياً قدره <strong>${sar(total)}</strong> (شامل)، يستحق نهاية كل شهر، يشمل:<br>
     • الأجر الأساسي: ${sar(basic_salary_sar)}<br>
     ${housing_allowance_sar ? `• بدل السكن: ${sar(housing_allowance_sar)}<br>` : ""}
     ${transport_allowance_sar ? `• بدل النقل: ${sar(transport_allowance_sar)}<br>` : ""}
     يُصرف الراتب عبر تحويل بنكي للآيبان المسجل للموظف وفقاً لنظام حماية الأجور (WPS).`
  )}

  <!-- Section 6 -->
  ${SECTION("6","Annual Leave","الإجازة السنوية",
    `The Second Party is entitled to a paid annual leave of twenty-one (21) calendar days per year (rising to 30 days after five continuous years of service), scheduled by the First Party according to work conditions. Leave pay shall be disbursed in advance of the leave commencement date per Article 109 of the Saudi Labour Law.`,
    `يستحق الطرف الثاني عن كل عام إجازة سنوية مدفوعة الأجر مدتها واحد وعشرون (٢١) يوماً (تزداد إلى ثلاثين يوماً بعد خمس سنوات خدمة متصلة). يحدد الطرف الأول تواريخها وفقاً لظروف العمل، على أن يُدفع أجر الإجازة مقدَّماً قبل تاريخ البدء وفقاً للمادة ١٠٩ من نظام العمل.`
  )}

  <!-- Section 7 -->
  ${SECTION("7","Insurance, GOSI & Government Fees","التأمين والتأمينات الاجتماعية والرسوم الحكومية",
    `The First Party shall: (a) provide medical care through health insurance in accordance with the Cooperative Health Insurance Law, covering the Second Party and eligible dependents; (b) pay GOSI contributions as per its regulations; (c) bear all recruitment/transfer fees, Iqama and work permit fees and renewals, exit/re-entry fees, profession-change fees, and the Second Party's return ticket upon end of employment.`,
    `يلتزم الطرف الأول بـ: (أ) توفير الرعاية الطبية بالتأمين الصحي التعاوني للطرف الثاني ومن يعولهم؛ (ب) سداد اشتراكات التأمينات الاجتماعية (GOSI)؛ (ج) تحمّل رسوم الاستقدام ونقل الخدمات ورسوم الإقامة ورخصة العمل وتجديدهما وغراماتهما، ورسوم تغيير المهنة والخروج والعودة، وتذكرة عودة الطرف الثاني عند انتهاء العلاقة.`
  )}

  <!-- Section 8 -->
  ${SECTION("8","Other Statutory Leaves","الإجازات النظامية الأخرى",
    `The Second Party is entitled to all statutory leaves under the Labour Law, including: maternity leave of 12 weeks with full pay; a daily nursing break not exceeding one hour; bereavement and paternity leave of 3 days each; marriage leave; Hajj leave (once during service); and sick leave on the tiered basis of Article 117. A female employee whose husband dies is entitled to iddah leave of not less than 4 months and 10 days with full pay.`,
    `يستحق الطرف الثاني جميع الإجازات المقررة بنظام العمل، منها: إجازة وضع (أمومة) اثنا عشر أسبوعاً بأجر كامل؛ فترة رضاعة لا تتجاوز ساعة يومياً؛ إجازة وفاة وإجازة أبوة بثلاثة أيام لكل منهما؛ إجازة زواج؛ إجازة حج مرة واحدة؛ والإجازة المرضية وفق التدرج المنصوص عليه في المادة ١١٧. وتستحق الموظفة عند وفاة زوجها إجازة عدة بأجر كامل لا تقل عن أربعة أشهر وعشرة أيام.`
  )}

  <!-- Section 9 -->
  ${SECTION("9","Obligations of the Second Party","التزامات الطرف الثاني",
    `The Second Party undertakes to: perform assigned work diligently according to professional standards and the First Party's lawful instructions; safeguard tools and materials entrusted and return non-consumables; assist without extra pay in cases threatening workplace safety; undergo required medical examinations; maintain good conduct; comply with applicable laws, regulations and instructions in the Kingdom and at the First Party; maintain full confidentiality of company information during and after employment.`,
    `يلتزم الطرف الثاني بـ: أداء العمل الموكل إليه باجتهاد وفق أصول المهنة وتعليمات الطرف الأول المشروعة؛ والعناية بالأدوات والخامات المسندة إليه وإعادة غير المستهلك؛ وتقديم العون دون أجر إضافي في حالات الأخطار؛ والخضوع للفحوص الطبية المطلوبة؛ والتزام حسن السلوك؛ والامتثال للأنظمة واللوائح المعمول بها في المملكة ولدى الطرف الأول؛ والمحافظة على سرية معلومات الشركة خلال العمل وبعد انتهائه.`
  )}

  <!-- Section 10 -->
  ${SECTION("10","Termination","انتهاء العقد وإنهاؤه",
    `This contract ends upon expiry of its term, by mutual written agreement, or by force majeure. The First Party may terminate without award, notice or compensation in cases of Article (80), provided the Second Party is given the opportunity to state objections. The Second Party may leave without notice while retaining all dues in cases of Article (81). If either party terminates without legitimate reason, the breaching party shall pay compensation of <strong>${termination_compensation_sar ? sar(termination_compensation_sar) : "XXXXX SAR"}</strong>.`,
    `ينتهي هذا العقد بانتهاء مدته، أو باتفاق الطرفين كتابةً، أو بقوة قاهرة. ويحق للطرف الأول فسخ العقد دون مكافأة أو إشعار أو تعويض في الحالات الواردة في المادة (٨٠) شريطة إتاحة الفرصة للطرف الثاني لإبداء أسباب اعتراضه. ويحق للطرف الثاني ترك العمل دون إشعار مع احتفاظه بكامل مستحقاته في الحالات الواردة في المادة (٨١). وفي حال فسخ أيٍّ من الطرفين العقد دون سبب مشروع يلتزم الطرف المخالف بدفع تعويض قدره <strong>${termination_compensation_sar ? sar(termination_compensation_sar) : "XXXXX"} ريال سعودي</strong>.`
  )}

  <!-- Section 11 -->
  ${SECTION("11","End-of-Service Award","مكافأة نهاية الخدمة",
    `Upon end of the contractual relationship, the Second Party is entitled to an end-of-service award of fifteen (15) days' wage for each of the first five years and one (1) month's wage for each subsequent year, calculated on the last wage, with pro-rata entitlement for partial years. Reductions on resignation apply per Articles (84–85) of the Labour Law.`,
    `يستحق الطرف الثاني عند انتهاء العلاقة العقدية مكافأة نهاية خدمة قدرها أجر خمسة عشر (١٥) يوماً عن كل سنة من السنوات الخمس الأولى وأجر شهر عن كل سنة من السنوات التالية، تُحسب على أساس الأجر الأخير، ويستحق مكافأة عن أجزاء السنة بنسبة ما قضاه. وتُطبَّق تخفيضات الاستقالة وفقاً للمادتين (٨٤ و٨٥) من نظام العمل.`
  )}

  <!-- Section 12 -->
  ${SECTION("12","Applicable Law, Notices & Jurisdiction","النظام الواجب التطبيق والإشعارات والاختصاص",
    `This contract is governed by the Saudi Labour Law, its Implementing Regulations and related decisions. Notices between the parties are made in writing through the Qiwa platform channels. The address and email registered in Qiwa are legally applicable. Disputes are referred to the competent labour authority in the Kingdom of Saudi Arabia. <strong>The Arabic text prevails in case of any discrepancy.</strong>`,
    `يخضع هذا العقد لنظام العمل السعودي ولائحته التنفيذية والقرارات الصادرة تنفيذاً له. وتتم الإشعارات بين الطرفين كتابةً عبر قنوات منصة قوى. ويُعد العنوان والبريد الإلكتروني المسجلان في قوى هما المعتمدان نظاماً. وعند نشوء أي خلاف يُرفع إلى الجهة المختصة بنظر القضايا العمالية في المملكة. <strong>وتكون النسخة العربية هي المعتمدة عند أي اختلاف.</strong>`
  )}

  <!-- Section 13 -->
  ${SECTION("13","Additional Terms","شروط إضافية",
    `<strong>13.1 Intellectual Property:</strong> All IP rights arising from the Second Party's work vest fully in the First Party; the Second Party shall assign such rights upon request.<br>
     <strong>13.2 Confidentiality:</strong> The Second Party shall not disclose or use any confidential information of the First Party during or after employment without prior written consent.<br>
     <strong>13.3 Non-Competition:</strong> Post-termination non-competition is limited to <em>${non_compete_scope || "XXXXX (max 2 years)"}</em>, per Article (83) of the Labour Law.<br>
     <strong>13.4 Data Protection:</strong> Personal data is processed per the Saudi Personal Data Protection Law (PDPL) and the First Party's privacy notice.<br>
     <strong>13.5 Exclusive Service:</strong> The Second Party shall not work for others or engage in competing activity without prior written consent.`,
    `<strong>١٣.١ الملكية الفكرية:</strong> تؤول إلى الطرف الأول جميع حقوق الملكية الفكرية الناشئة عن أعمال الطرف الثاني لديه، ويتعهد الطرف الثاني بنقلها وتسجيلها باسم الطرف الأول عند الطلب.<br>
     <strong>١٣.٢ السرية:</strong> يلتزم الطرف الثاني بعدم إفشاء أو استخدام أي معلومات سرية تخص الطرف الأول أثناء العمل وبعد انتهائه إلا بموافقة كتابية مسبقة.<br>
     <strong>١٣.٣ عدم المنافسة:</strong> يقتصر شرط عدم المنافسة بعد انتهاء العقد على <em>${non_compete_scope || "XXXXX (بحد أقصى سنتين)"}</em> وفقاً للمادة (٨٣) من نظام العمل.<br>
     <strong>١٣.٤ حماية البيانات:</strong> تُعالَج البيانات الشخصية وفقاً لنظام حماية البيانات الشخصية (PDPL) وإشعار الخصوصية المعتمد لدى الطرف الأول.<br>
     <strong>١٣.٥ التفرغ:</strong> لا يجوز للطرف الثاني العمل لدى الغير أو ممارسة أي نشاط منافس دون موافقة كتابية مسبقة.`
  )}

  <!-- Section 14 — Signatures -->
  <tr><td class="sec-head">14. Signatures</td><td class="sec-head rtl">١٤. التوقيعات</td></tr>
</table>

<table class="sig-table">
  <tr>
    <td class="sig-cell">
      <strong>First Party (Employer)</strong><br>
      Name: Ahmed Al-Helmy<br>
      Title: People Lead, THINK AI<br>
      <div class="sig-line">Signature: _____________________ &nbsp;&nbsp; Date: _____________</div>
    </td>
    <td class="sig-cell rtl">
      <strong>الطرف الأول (صاحب العمل)</strong><br>
      الاسم: أحمد الهلمي<br>
      الصفة: مسؤول تطوير الكوادر البشرية، ثينك أي آي<br>
      <div class="sig-line">التوقيع: _____________________ &nbsp;&nbsp; التاريخ: _____________</div>
    </td>
  </tr>
  <tr>
    <td class="sig-cell">
      <strong>Second Party (Employee)</strong><br>
      Name: ${name_en}<br>
      ID / Iqama: ${id_number || "XXXXX"}<br>
      <div class="sig-line">Signature: _____________________ &nbsp;&nbsp; Date: _____________</div>
    </td>
    <td class="sig-cell rtl">
      <strong>الطرف الثاني (الموظف)</strong><br>
      الاسم: ${name_ar || name_en}<br>
      رقم الهوية / الإقامة: ${id_number || "XXXXX"}<br>
      <div class="sig-line">التوقيع: _____________________ &nbsp;&nbsp; التاريخ: _____________</div>
    </td>
  </tr>
</table>

<div class="footer">
  THINK AI · Riyadh, Kingdom of Saudi Arabia · people@think-ai.com<br>
  Generated by THINK-AI People Hub · ${new Date().toLocaleDateString()} · This is an operational aid, not a legally binding document. Authenticate on Qiwa.
</div>
</body>
</html>`;
}

export interface SSCOResult {
  code: string;
  en: string;
  ar: string;
  /** "reserved" = Saudi nationals only NOW | "reserved_oct2026" = reserved Oct 2026 | "open" = expats allowed */
  saudization: "reserved" | "reserved_oct2026" | "open";
  /** Next Nitaqat / Saudization review cycle */
  next_review: string;
}

// Comprehensive SSCO map aligned with Saudi MHRSD Nitaqat (updated July 2026)
// Source: SSCO/ISCO-08, Ministry of HR & Social Development Circulars 2024-2025
const SSCO_MAP: Array<{ keywords: string[]; levelMin?: number; levelMax?: number; result: SSCOResult }> = [
  // ── C-Suite / Executive (ISCO 1120) — open to all nationalities ──────────────
  { keywords: ["co-founder","cofounder","founder"], result: { code:"1120", en:"Co-Founder / Chief Executive", ar:"شريك مؤسس / رئيس تنفيذي", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["chief executive","ceo"], result: { code:"1120", en:"Chief Executive Officer", ar:"الرئيس التنفيذي", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["chief technology","cto"], result: { code:"1120", en:"Chief Technology Officer", ar:"الرئيس التنفيذي للتقنية", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["chief operating","coo"], result: { code:"1120", en:"Chief Operating Officer", ar:"الرئيس التنفيذي للعمليات", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["chief financial","cfo"], result: { code:"1120", en:"Chief Financial Officer", ar:"الرئيس التنفيذي للمالية", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["chief product","cpo"], result: { code:"1120", en:"Chief Product Officer", ar:"الرئيس التنفيذي للمنتج", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["chief people","chief hr","chief human"], result: { code:"1120", en:"Chief People Officer", ar:"الرئيس التنفيذي للأفراد", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["chief revenue","cro"], result: { code:"1120", en:"Chief Revenue Officer", ar:"الرئيس التنفيذي للإيرادات", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["vice president","vp of","vp -"], result: { code:"1120", en:"Vice President", ar:"نائب الرئيس", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["managing director","md"], result: { code:"1120", en:"Managing Director", ar:"المدير التنفيذي", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["country manager"], result: { code:"1120", en:"Country Manager", ar:"مدير الدولة", saudization:"open", next_review:"2027-01-01" }},

  // ── HR Manager (ISCO 1212) — RESERVED for Saudi nationals NOW ────────────────
  { keywords: ["hr manager","human resources manager","people manager","hr director","people director","head of hr","head of people","hr business partner","hrbp"], result: { code:"1212", en:"Human Resources Manager", ar:"مدير الموارد البشرية", saudization:"reserved", next_review:"2026-10-01" }},
  { keywords: ["talent acquisition manager","recruitment manager","talent manager"], result: { code:"1212", en:"Talent Acquisition Manager", ar:"مدير اكتساب المواهب", saudization:"reserved", next_review:"2026-10-01" }},
  { keywords: ["compensation manager","rewards manager","c&b manager","total rewards"], result: { code:"1212", en:"Compensation & Benefits Manager", ar:"مدير المكافآت والمزايا", saudization:"reserved", next_review:"2026-10-01" }},
  { keywords: ["training manager","l&d manager","learning manager","od manager","organizational development"], result: { code:"1212", en:"Training & Development Manager", ar:"مدير التدريب والتطوير", saudization:"reserved", next_review:"2026-10-01" }},

  // ── HR Specialist (ISCO 2423) — RESERVED NOW (tech sector) ──────────────────
  { keywords: ["hr specialist","hr generalist","hr officer","people ops","people operations","hr coordinator","hr analyst"], result: { code:"2423", en:"Human Resources Specialist", ar:"أخصائي موارد بشرية", saudization:"reserved", next_review:"2026-10-01" }},
  { keywords: ["talent acquisition specialist","recruiter","recruiting","sourcer"], result: { code:"2423", en:"Talent Acquisition Specialist", ar:"أخصائي اكتساب المواهب", saudization:"reserved", next_review:"2026-10-01" }},
  { keywords: ["compensation specialist","payroll specialist","payroll officer"], result: { code:"2423", en:"Compensation Specialist / Payroll", ar:"أخصائي تعويضات / مسير الرواتب", saudization:"reserved", next_review:"2026-10-01" }},
  { keywords: ["learning specialist","training specialist","l&d specialist","instructional designer"], result: { code:"2423", en:"Learning & Development Specialist", ar:"أخصائي التعلم والتطوير", saudization:"reserved", next_review:"2026-10-01" }},

  // ── HR Clerk (ISCO 3333) — reserved Oct 2026 ────────────────────────────────
  { keywords: ["hr admin","hr assistant","hr clerk","hr support","people admin"], result: { code:"3333", en:"HR Administrative Clerk", ar:"موظف إداري للموارد البشرية", saudization:"reserved_oct2026", next_review:"2026-10-01" }},

  // ── Software / Tech (ISCO 2512) — open ───────────────────────────────────────
  { keywords: ["software engineer","software developer","full stack","fullstack","backend engineer","frontend engineer","full-stack"], result: { code:"2512", en:"Software Engineer", ar:"مهندس برمجيات", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["senior software","staff engineer","principal engineer","lead engineer","engineering lead"], result: { code:"2512", en:"Senior Software Engineer", ar:"مهندس برمجيات أول", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["mobile developer","ios developer","android developer","flutter","react native"], result: { code:"2512", en:"Mobile Application Developer", ar:"مطور تطبيقات جوال", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["devops","platform engineer","sre","site reliability","infrastructure engineer","cloud engineer"], result: { code:"2512", en:"DevOps / Platform Engineer", ar:"مهندس عمليات البرمجيات", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["qa engineer","quality assurance","test engineer","sdet"], result: { code:"2512", en:"QA / Test Engineer", ar:"مهندس ضمان الجودة", saudization:"open", next_review:"2027-01-01" }},

  // ── AI / Data Science (ISCO 2511) — open ────────────────────────────────────
  { keywords: ["data scientist","machine learning","ml engineer","ai engineer","ai researcher","deep learning"], result: { code:"2511", en:"Data Scientist / AI Engineer", ar:"عالم بيانات / مهندس ذكاء اصطناعي", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["data analyst","business analyst","bi analyst","business intelligence"], result: { code:"2511", en:"Data / Business Analyst", ar:"محلل بيانات / أعمال", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["data engineer","etl","pipeline engineer","analytics engineer"], result: { code:"2511", en:"Data Engineer", ar:"مهندس البيانات", saudization:"open", next_review:"2027-01-01" }},

  // ── Product (ISCO 1223) ──────────────────────────────────────────────────────
  { keywords: ["product manager","product lead","pm","vp product"], result: { code:"1223", en:"Product Manager", ar:"مدير المنتج", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["product owner","scrum master","agile coach"], result: { code:"1223", en:"Product Owner / Agile Lead", ar:"مالك المنتج / قائد أجايل", saudization:"open", next_review:"2027-01-01" }},

  // ── Design (ISCO 2166) — open ────────────────────────────────────────────────
  { keywords: ["ux designer","ui designer","product designer","ux/ui","ui/ux","user experience","user interface"], result: { code:"2166", en:"UX / UI Designer", ar:"مصمم تجربة المستخدم", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["graphic designer","visual designer","brand designer","motion designer"], result: { code:"2166", en:"Graphic / Visual Designer", ar:"مصمم جرافيك / بصري", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["creative director","head of design","design lead","design director"], result: { code:"2166", en:"Creative Director", ar:"المدير الإبداعي", saudization:"open", next_review:"2027-01-01" }},

  // ── Finance / Accounting (ISCO 1211) ────────────────────────────────────────
  { keywords: ["finance director","finance manager","financial controller","vp finance","head of finance"], result: { code:"1211", en:"Finance Director / Manager", ar:"مدير الشؤون المالية", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["accountant","accounting","financial analyst","fp&a","financial planning"], result: { code:"2411", en:"Accountant / Financial Analyst", ar:"محاسب / محلل مالي", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["auditor","internal audit"], result: { code:"2411", en:"Auditor", ar:"مدقق حسابات", saudization:"open", next_review:"2027-01-01" }},

  // ── Marketing (ISCO 1222) ────────────────────────────────────────────────────
  { keywords: ["marketing manager","marketing director","vp marketing","head of marketing"], result: { code:"1222", en:"Marketing Manager", ar:"مدير التسويق", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["growth manager","growth lead","growth hacker"], result: { code:"1222", en:"Growth Manager", ar:"مدير النمو", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["marketing specialist","digital marketing","content marketing","seo","sem","performance marketing"], result: { code:"2431", en:"Marketing Specialist", ar:"أخصائي تسويق", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["brand manager","brand director","brand lead"], result: { code:"1222", en:"Brand Manager", ar:"مدير العلامة التجارية", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["social media","community manager","content creator"], result: { code:"2431", en:"Social Media / Content Specialist", ar:"أخصائي وسائل التواصل الاجتماعي", saudization:"open", next_review:"2027-01-01" }},

  // ── Sales (ISCO 3322) ────────────────────────────────────────────────────────
  { keywords: ["sales director","head of sales","vp sales","sales manager"], result: { code:"1221", en:"Sales Director / Manager", ar:"مدير المبيعات", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["account executive","account manager","sales executive","business development manager","bdm"], result: { code:"3322", en:"Account / Business Development Manager", ar:"مدير حسابات / تطوير أعمال", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["sales representative","sales rep","inside sales","sales associate"], result: { code:"3322", en:"Sales Representative", ar:"مندوب مبيعات", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["customer success","csm","client success","account success"], result: { code:"3322", en:"Customer Success Manager", ar:"مدير نجاح العملاء", saudization:"open", next_review:"2027-01-01" }},

  // ── Operations / Management (ISCO 1324) ─────────────────────────────────────
  { keywords: ["operations manager","operations director","head of operations","chief of staff"], result: { code:"1324", en:"Operations Manager", ar:"مدير العمليات", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["project manager","program manager","delivery manager","project lead"], result: { code:"1324", en:"Project / Program Manager", ar:"مدير المشاريع / البرامج", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["business operations","biz ops","strategy manager","strategy director"], result: { code:"1324", en:"Business Operations / Strategy", ar:"مدير استراتيجية / عمليات الأعمال", saudization:"open", next_review:"2027-01-01" }},

  // ── Legal / Compliance (ISCO 2611) ──────────────────────────────────────────
  { keywords: ["legal counsel","general counsel","corporate counsel","in-house counsel"], result: { code:"2611", en:"Legal Counsel", ar:"المستشار القانوني", saudization:"open", next_review:"2027-01-01" }},
  { keywords: ["compliance manager","compliance officer","risk manager","grc"], result: { code:"2611", en:"Compliance / Risk Manager", ar:"مدير الامتثال / المخاطر", saudization:"open", next_review:"2027-01-01" }},

  // ── Cybersecurity (ISCO 2529) ────────────────────────────────────────────────
  { keywords: ["security engineer","cybersecurity","infosec","information security","penetration","pen tester","ciso"], result: { code:"2529", en:"Information Security / Cybersecurity Engineer", ar:"مهندس أمن المعلومات والأمن السيبراني", saudization:"open", next_review:"2027-01-01" }},

  // ── Director / Head (generic) ────────────────────────────────────────────────
  { keywords: ["director of","head of","vp of"], result: { code:"1120", en:"Director / Head of Function", ar:"مدير / رئيس وظيفة", saudization:"open", next_review:"2027-01-01" }},
];

export function suggestSSCO(role: string, level: string): SSCOResult {
  const r = (role || "").toLowerCase().trim();
  const L = parseInt((level || "L6").replace("L", ""));

  // High-level override: L14+ → executive regardless
  if (L >= 14) {
    return { code:"1120", en:"Senior Executive", ar:"مسؤول تنفيذي أول", saudization:"open", next_review:"2027-01-01" };
  }

  for (const entry of SSCO_MAP) {
    const levelOk = (entry.levelMin == null || L >= entry.levelMin) && (entry.levelMax == null || L <= entry.levelMax);
    if (levelOk && entry.keywords.some(kw => r.includes(kw))) {
      return entry.result;
    }
  }

  // Fallback by level bracket
  if (L >= 11) return { code:"1120", en:"Senior Executive", ar:"مسؤول تنفيذي أول", saudization:"open", next_review:"2027-01-01" };
  if (L >= 8)  return { code:"1324", en:"Senior Manager", ar:"مدير أول", saudization:"open", next_review:"2027-01-01" };
  return { code:"2512", en:"Professional Specialist", ar:"أخصائي مهني", saudization:"open", next_review:"2027-01-01" };
}

/** Suggest SSCO directly from a free-text job title (used in form auto-suggest) */
export function suggestSSCOFromTitle(title: string): SSCOResult {
  return suggestSSCO(title, "L6");
}
