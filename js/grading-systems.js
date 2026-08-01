window.SM_GRADING = (function () {
  "use strict";
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  var SYSTEMS = [
    {
      id: "us", name: "United States", flag: "🇺🇸", region: "Americas",
      scale: "4.0 Letter Grade", scaleType: "letter4", scaleMax: 4.0, passMark: 1.0,
      creditUnit: "Credit Hours", termName: "Semester", gpaScale: "4.0 Scale",
      grades: [
        {label:"A+", min:97, max:100, gpa4:4.0, cls:"Exceptional"},
        {label:"A",  min:93, max:96,  gpa4:4.0, cls:"Excellent"},
        {label:"A-", min:90, max:92,  gpa4:3.7, cls:"Excellent"},
        {label:"B+", min:87, max:89,  gpa4:3.3, cls:"Good"},
        {label:"B",  min:83, max:86,  gpa4:3.0, cls:"Good"},
        {label:"B-", min:80, max:82,  gpa4:2.7, cls:"Good"},
        {label:"C+", min:77, max:79,  gpa4:2.3, cls:"Satisfactory"},
        {label:"C",  min:73, max:76,  gpa4:2.0, cls:"Satisfactory"},
        {label:"C-", min:70, max:72,  gpa4:1.7, cls:"Satisfactory"},
        {label:"D+", min:67, max:69,  gpa4:1.3, cls:"Passing"},
        {label:"D",  min:63, max:66,  gpa4:1.0, cls:"Passing"},
        {label:"D-", min:60, max:62,  gpa4:0.7, cls:"Minimum Pass"},
        {label:"F",  min:0,  max:59,  gpa4:0.0, cls:"Failing"}
      ],
      tip: "Most US universities require a minimum 2.0 GPA for good academic standing.",
      toGPA4: function(p) {
        p = clamp(+p, 0, 100);
        if(p>=97)return 4.0; if(p>=93)return 4.0; if(p>=90)return 3.7;
        if(p>=87)return 3.3; if(p>=83)return 3.0; if(p>=80)return 2.7;
        if(p>=77)return 2.3; if(p>=73)return 2.0; if(p>=70)return 1.7;
        if(p>=67)return 1.3; if(p>=63)return 1.0; if(p>=60)return 0.7;
        return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(60 + (g4/4)*40, 0, 100)); }
    },
    {
      id: "ca", name: "Canada", flag: "🇨🇦", region: "Americas",
      scale: "Percentage (Letter Variant)", scaleType: "percentage", scaleMax: 100, passMark: 50,
      creditUnit: "Credit Hours", termName: "Semester", gpaScale: "4.0 / 4.3 Scale",
      grades: [
        {label:"A+", min:90, max:100, gpa4:4.0, cls:"Exceptional"},
        {label:"A",  min:85, max:89,  gpa4:4.0, cls:"Excellent"},
        {label:"A-", min:80, max:84,  gpa4:3.7, cls:"Very Good"},
        {label:"B+", min:77, max:79,  gpa4:3.3, cls:"Good"},
        {label:"B",  min:73, max:76,  gpa4:3.0, cls:"Good"},
        {label:"B-", min:70, max:72,  gpa4:2.7, cls:"Satisfactory"},
        {label:"C+", min:67, max:69,  gpa4:2.3, cls:"Satisfactory"},
        {label:"C",  min:63, max:66,  gpa4:2.0, cls:"Adequate"},
        {label:"C-", min:60, max:62,  gpa4:1.7, cls:"Adequate"},
        {label:"D",  min:50, max:59,  gpa4:1.0, cls:"Minimum Pass"},
        {label:"F",  min:0,  max:49,  gpa4:0.0, cls:"Failing"}
      ],
      tip: "Grading scales vary by province and institution; most use 4.0 or 4.3 scales.",
      toGPA4: function(p) {
        p = clamp(+p, 0, 100);
        if(p>=90)return 4.0; if(p>=85)return 4.0; if(p>=80)return 3.7;
        if(p>=77)return 3.3; if(p>=73)return 3.0; if(p>=70)return 2.7;
        if(p>=67)return 2.3; if(p>=63)return 2.0; if(p>=60)return 1.7;
        if(p>=50)return 1.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(50 + (g4/4)*50, 0, 100)); }
    },
    {
      id: "uk", name: "United Kingdom", flag: "🇬🇧", region: "Europe",
      scale: "Honours Classification", scaleType: "percentage", scaleMax: 100, passMark: 40,
      creditUnit: "Credits (CAT Points)", termName: "Term", gpaScale: "Honours Classification",
      grades: [
        {label:"First (1st)",          min:70, max:100, gpa4:4.0, cls:"Highest"},
        {label:"Upper Second (2:1)",   min:60, max:69,  gpa4:3.3, cls:"Very Good"},
        {label:"Lower Second (2:2)",   min:50, max:59,  gpa4:2.7, cls:"Good"},
        {label:"Third (3rd)",          min:40, max:49,  gpa4:2.0, cls:"Satisfactory"},
        {label:"Fail",                 min:0,  max:39,  gpa4:0.0, cls:"Failing"}
      ],
      tip: "A 2:1 (Upper Second) is typically the minimum required for graduate programmes.",
      toGPA4: function(p) {
        p = clamp(+p, 0, 100);
        if(p>=70)return 4.0; if(p>=60)return 3.3; if(p>=50)return 2.7;
        if(p>=40)return 2.0; return 0.0;
      },
      toNative: function(g4) {
        if(g4>=4.0)return 72; if(g4>=3.3)return 63; if(g4>=2.7)return 53;
        if(g4>=2.0)return 43; return 35;
      }
    },
    {
      id: "ie", name: "Ireland", flag: "🇮🇪", region: "Europe",
      scale: "Percentage + Honour Class", scaleType: "percentage", scaleMax: 100, passMark: 40,
      creditUnit: "ECTS Credits", termName: "Semester", gpaScale: "GPA 4.0 (NFQ aligned)",
      grades: [
        {label:"First Class Honours",   min:70, max:100, gpa4:4.0, cls:"H1"},
        {label:"Second Class H.I",      min:60, max:69,  gpa4:3.3, cls:"H2.1"},
        {label:"Second Class H.II",     min:50, max:59,  gpa4:2.7, cls:"H2.2"},
        {label:"Third Class Honours",   min:40, max:49,  gpa4:2.0, cls:"H3"},
        {label:"Fail",                  min:0,  max:39,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Irish higher education uses ECTS credits aligned to the National Framework of Qualifications.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=70)return 4.0; if(p>=60)return 3.3; if(p>=50)return 2.7;
        if(p>=40)return 2.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(40+(g4/4)*60,0,100)); }
    },
    {
      id: "de", name: "Germany", flag: "🇩🇪", region: "Europe",
      scale: "1–5 Numeric Scale", scaleType: "numeric5inv", scaleMax: 1, passMark: 4,
      creditUnit: "ECTS Credits", termName: "Semester", gpaScale: "1.0 (best) – 5.0 (fail)",
      grades: [
        {label:"1.0 – 1.5 Sehr gut",       min:1.0, max:1.5, gpa4:4.0, cls:"Very Good"},
        {label:"1.6 – 2.5 Gut",             min:1.6, max:2.5, gpa4:3.3, cls:"Good"},
        {label:"2.6 – 3.5 Befriedigend",    min:2.6, max:3.5, gpa4:2.3, cls:"Satisfactory"},
        {label:"3.6 – 4.0 Ausreichend",     min:3.6, max:4.0, gpa4:1.3, cls:"Sufficient"},
        {label:"4.1 – 5.0 Nicht bestanden", min:4.1, max:5.0, gpa4:0.0, cls:"Fail"}
      ],
      tip: "In Germany, lower is better — 1.0 is the highest grade (Sehr gut = Very Good).",
      toGPA4: function(g) {
        g=clamp(+g,1,5);
        if(g<=1.5)return 4.0; if(g<=2.0)return 3.7; if(g<=2.5)return 3.3;
        if(g<=3.0)return 2.7; if(g<=3.5)return 2.0; if(g<=4.0)return 1.0;
        return 0.0;
      },
      toNative: function(g4) { return +(1 + ((4-g4)/4)*3).toFixed(1); }
    },
    {
      id: "fr", name: "France", flag: "🇫🇷", region: "Europe",
      scale: "0–20 Numeric Scale", scaleType: "numeric20", scaleMax: 20, passMark: 10,
      creditUnit: "ECTS Credits", termName: "Semester", gpaScale: "0–20 points",
      grades: [
        {label:"16–20 Très bien",    min:16, max:20, gpa4:4.0, cls:"Very Good"},
        {label:"14–15 Bien",         min:14, max:15, gpa4:3.7, cls:"Good"},
        {label:"12–13 Assez bien",   min:12, max:13, gpa4:3.0, cls:"Quite Good"},
        {label:"10–11 Passable",     min:10, max:11, gpa4:2.0, cls:"Pass"},
        {label:"0–9  Insuffisant",   min:0,  max:9,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Scoring above 14/20 in France is considered excellent; above 16 is rare.",
      toGPA4: function(g) {
        g=clamp(+g,0,20);
        if(g>=16)return 4.0; if(g>=14)return 3.7; if(g>=12)return 3.0;
        if(g>=10)return 2.0; return 0.0;
      },
      toNative: function(g4) { return +(g4/4*20).toFixed(1); }
    },
    {
      id: "it", name: "Italy", flag: "🇮🇹", region: "Europe",
      scale: "18–30 Numeric Scale", scaleType: "numeric30", scaleMax: 30, passMark: 18,
      creditUnit: "CFU (ECTS)", termName: "Semester", gpaScale: "18–30 (30L = cum laude)",
      grades: [
        {label:"30L (30 con lode)", min:30, max:30,  gpa4:4.0, cls:"Exceptional"},
        {label:"27–30",             min:27, max:29,  gpa4:3.7, cls:"Very Good"},
        {label:"24–26",             min:24, max:26,  gpa4:3.0, cls:"Good"},
        {label:"21–23",             min:21, max:23,  gpa4:2.3, cls:"Satisfactory"},
        {label:"18–20",             min:18, max:20,  gpa4:1.7, cls:"Pass"},
        {label:"< 18",              min:0,  max:17,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "30 e Lode (30L) is the highest mark in Italy, awarded for exceptional performance.",
      toGPA4: function(g) {
        g=clamp(+g,0,30);
        if(g>=30)return 4.0; if(g>=27)return 3.7; if(g>=24)return 3.0;
        if(g>=21)return 2.3; if(g>=18)return 1.7; return 0.0;
      },
      toNative: function(g4) { return Math.round(18+(g4/4)*12); }
    },
    {
      id: "es", name: "Spain", flag: "🇪🇸", region: "Europe",
      scale: "0–10 Numeric Scale", scaleType: "numeric10", scaleMax: 10, passMark: 5,
      creditUnit: "ECTS Credits", termName: "Semester", gpaScale: "0–10 points",
      grades: [
        {label:"9–10 Sobresaliente",  min:9, max:10, gpa4:4.0, cls:"Distinction"},
        {label:"7–8.9 Notable",       min:7, max:8.9,gpa4:3.0, cls:"Merit"},
        {label:"5–6.9 Aprobado",      min:5, max:6.9,gpa4:2.0, cls:"Pass"},
        {label:"0–4.9 Suspenso",      min:0, max:4.9,gpa4:0.0, cls:"Fail"}
      ],
      tip: "Spanish universities use a 0–10 scale; the pass mark is typically 5.",
      toGPA4: function(g) {
        g=clamp(+g,0,10);
        if(g>=9)return 4.0; if(g>=7)return 3.0; if(g>=5)return 2.0; return 0.0;
      },
      toNative: function(g4) { return +(g4/4*10).toFixed(1); }
    },
    {
      id: "nl", name: "Netherlands", flag: "🇳🇱", region: "Europe",
      scale: "1–10 Numeric Scale", scaleType: "numeric10", scaleMax: 10, passMark: 5.5,
      creditUnit: "ECTS Credits", termName: "Semester", gpaScale: "1–10 scale",
      grades: [
        {label:"9–10 Uitstekend",       min:9,   max:10, gpa4:4.0, cls:"Outstanding"},
        {label:"8–8.9 Zeer goed",       min:8,   max:8.9,gpa4:3.7, cls:"Very Good"},
        {label:"7–7.9 Goed",            min:7,   max:7.9,gpa4:3.0, cls:"Good"},
        {label:"6–6.9 Ruim voldoende",  min:6,   max:6.9,gpa4:2.3, cls:"More than Satisfactory"},
        {label:"5.5–5.9 Voldoende",     min:5.5, max:5.9,gpa4:2.0, cls:"Satisfactory"},
        {label:"< 5.5 Onvoldoende",     min:0,   max:5.4,gpa4:0.0, cls:"Fail"}
      ],
      tip: "Dutch grading is strict — an 8 is genuinely excellent; 10s are almost never given.",
      toGPA4: function(g) {
        g=clamp(+g,1,10);
        if(g>=9)return 4.0; if(g>=8)return 3.7; if(g>=7)return 3.0;
        if(g>=6)return 2.3; if(g>=5.5)return 2.0; return 0.0;
      },
      toNative: function(g4) { return +(1+(g4/4)*9).toFixed(1); }
    },
    {
      id: "se", name: "Sweden", flag: "🇸🇪", region: "Europe",
      scale: "A–F / VG–IG", scaleType: "alphanumeric", scaleMax: 5, passMark: 2,
      creditUnit: "ECTS Credits", termName: "Semester", gpaScale: "A–E (pass), Fx/F (fail)",
      grades: [
        {label:"A – Utmärkt",             min:90, max:100, gpa4:4.0, cls:"Excellent"},
        {label:"B – Mycket bra",          min:80, max:89,  gpa4:3.7, cls:"Very Good"},
        {label:"C – Bra",                 min:70, max:79,  gpa4:3.0, cls:"Good"},
        {label:"D – Tillfredsställande",  min:60, max:69,  gpa4:2.0, cls:"Satisfactory"},
        {label:"E – Tillräcklig",         min:50, max:59,  gpa4:1.0, cls:"Sufficient"},
        {label:"Fx – Otillräcklig",       min:45, max:49,  gpa4:0.0, cls:"Insufficient (resit)"},
        {label:"F – Underkänd",           min:0,  max:44,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Swedish universities use ECTS A–F scale; Fx allows one chance to pass with supplementary work.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=90)return 4.0; if(p>=80)return 3.7; if(p>=70)return 3.0;
        if(p>=60)return 2.0; if(p>=50)return 1.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(g4/4*100,0,100)); }
    },
    {
      id: "no", name: "Norway", flag: "🇳🇴", region: "Europe",
      scale: "A–F Scale", scaleType: "alphanumeric", scaleMax: 5, passMark: 2,
      creditUnit: "ECTS Credits", termName: "Semester", gpaScale: "A–E (pass), F (fail)",
      grades: [
        {label:"A – Fremragende",      min:90, max:100, gpa4:4.0, cls:"Excellent"},
        {label:"B – Meget god",        min:77, max:89,  gpa4:3.5, cls:"Very Good"},
        {label:"C – God",              min:63, max:76,  gpa4:3.0, cls:"Good"},
        {label:"D – Nokså god",        min:50, max:62,  gpa4:2.0, cls:"Satisfactory"},
        {label:"E – Tilstrekkelig",    min:40, max:49,  gpa4:1.0, cls:"Sufficient"},
        {label:"F – Ikke bestått",     min:0,  max:39,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Norwegian universities issue A–F grades. Failing is F; all others (A–E) are passing.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=90)return 4.0; if(p>=77)return 3.5; if(p>=63)return 3.0;
        if(p>=50)return 2.0; if(p>=40)return 1.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(g4/4*100,0,100)); }
    },
    {
      id: "dk", name: "Denmark", flag: "🇩🇰", region: "Europe",
      scale: "7-Point Scale", scaleType: "numeric7", scaleMax: 12, passMark: 2,
      creditUnit: "ECTS Credits", termName: "Semester", gpaScale: "12, 10, 7, 4, 02, 00, -3",
      grades: [
        {label:"12 – Fremragende",    min:12,  max:12,  gpa4:4.0, cls:"Excellent"},
        {label:"10 – Fortrinlig",     min:10,  max:10,  gpa4:3.7, cls:"Very Good"},
        {label:"7 – God",             min:7,   max:7,   gpa4:3.0, cls:"Good"},
        {label:"4 – Jævn",            min:4,   max:4,   gpa4:2.0, cls:"Fair"},
        {label:"02 – Tilstrækkelig",  min:2,   max:2,   gpa4:1.0, cls:"Adequate"},
        {label:"00 – Utilstrækkelig", min:0,   max:0,   gpa4:0.0, cls:"Insufficient"},
        {label:"-3 – Uacceptabel",    min:-3,  max:-1,  gpa4:0.0, cls:"Unacceptable"}
      ],
      tip: "Denmark uses a 7-step scale: 12, 10, 7, 4, 02, 00, -3. Grade 02 is the minimum pass.",
      toGPA4: function(g) {
        g=+g;
        if(g>=12)return 4.0; if(g>=10)return 3.7; if(g>=7)return 3.0;
        if(g>=4)return 2.0;  if(g>=2)return 1.0;  return 0.0;
      },
      toNative: function(g4) {
        if(g4>=4.0)return 12; if(g4>=3.7)return 10; if(g4>=3.0)return 7;
        if(g4>=2.0)return 4;  if(g4>=1.0)return 2;  return 0;
      }
    },
    {
      id: "fi", name: "Finland", flag: "🇫🇮", region: "Europe",
      scale: "0–5 Numeric Scale", scaleType: "numeric5", scaleMax: 5, passMark: 1,
      creditUnit: "ECTS Credits", termName: "Period", gpaScale: "0–5 scale",
      grades: [
        {label:"5 – Erinomainen",   min:5, max:5, gpa4:4.0, cls:"Excellent"},
        {label:"4 – Kiitettävä",    min:4, max:4, gpa4:3.5, cls:"Very Good"},
        {label:"3 – Hyvä",          min:3, max:3, gpa4:3.0, cls:"Good"},
        {label:"2 – Tyydyttävä",    min:2, max:2, gpa4:2.0, cls:"Satisfactory"},
        {label:"1 – Välttävä",      min:1, max:1, gpa4:1.0, cls:"Adequate"},
        {label:"0 – Hylätty",       min:0, max:0, gpa4:0.0, cls:"Fail"}
      ],
      tip: "Finnish universities use a simple 0–5 scale; 1 is the minimum pass.",
      toGPA4: function(g) {
        g=clamp(+g,0,5);
        if(g>=5)return 4.0; if(g>=4)return 3.5; if(g>=3)return 3.0;
        if(g>=2)return 2.0; if(g>=1)return 1.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(g4/4*5); }
    },
    {
      id: "pk", name: "Pakistan", flag: "🇵🇰", region: "South Asia",
      scale: "4.0 GPA (Percentage base)", scaleType: "percentage", scaleMax: 100, passMark: 50,
      creditUnit: "Credit Hours", termName: "Semester", gpaScale: "4.0 Scale",
      grades: [
        {label:"A+ (85–100%)",  min:85, max:100, gpa4:4.0, cls:"Excellent"},
        {label:"A  (80–84%)",   min:80, max:84,  gpa4:3.7, cls:"Excellent"},
        {label:"B+ (75–79%)",   min:75, max:79,  gpa4:3.3, cls:"Good"},
        {label:"B  (71–74%)",   min:71, max:74,  gpa4:3.0, cls:"Good"},
        {label:"B- (68–70%)",   min:68, max:70,  gpa4:2.7, cls:"Good"},
        {label:"C+ (64–67%)",   min:64, max:67,  gpa4:2.3, cls:"Satisfactory"},
        {label:"C  (61–63%)",   min:61, max:63,  gpa4:2.0, cls:"Satisfactory"},
        {label:"C- (58–60%)",   min:58, max:60,  gpa4:1.7, cls:"Satisfactory"},
        {label:"D+ (54–57%)",   min:54, max:57,  gpa4:1.3, cls:"Pass"},
        {label:"D  (50–53%)",   min:50, max:53,  gpa4:1.0, cls:"Pass"},
        {label:"F  (< 50%)",    min:0,  max:49,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Pakistani HEC-affiliated universities use a 4.0 GPA derived from percentage marks.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=85)return 4.0; if(p>=80)return 3.7; if(p>=75)return 3.3;
        if(p>=71)return 3.0; if(p>=68)return 2.7; if(p>=64)return 2.3;
        if(p>=61)return 2.0; if(p>=58)return 1.7; if(p>=54)return 1.3;
        if(p>=50)return 1.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(50+(g4/4)*50,0,100)); }
    },
    {
      id: "in", name: "India", flag: "🇮🇳", region: "South Asia",
      scale: "10-point CGPA (CBSE/UGC)", scaleType: "gpa10", scaleMax: 10, passMark: 4,
      creditUnit: "Credit Points", termName: "Semester", gpaScale: "10-point Scale",
      grades: [
        {label:"O / A+ (91–100)",  min:91, max:100, gpa4:10, cls:"Outstanding"},
        {label:"A+ / A (81–90)",   min:81, max:90,  gpa4:9,  cls:"Excellent"},
        {label:"A  (71–80)",       min:71, max:80,  gpa4:8,  cls:"Very Good"},
        {label:"B+ (61–70)",       min:61, max:70,  gpa4:7,  cls:"Good"},
        {label:"B  (51–60)",       min:51, max:60,  gpa4:6,  cls:"Above Average"},
        {label:"C  (41–50)",       min:41, max:50,  gpa4:5,  cls:"Average"},
        {label:"P  (36–40)",       min:36, max:40,  gpa4:4,  cls:"Pass"},
        {label:"F  (< 36)",        min:0,  max:35,  gpa4:0,  cls:"Fail"}
      ],
      tip: "Most Indian universities use a 10-point CGPA. Percentage ≈ CGPA × 9.5 (CBSE formula).",
      toGPA4: function(g) {
        g=clamp(+g,0,10);
        return +(g/10*4).toFixed(2);
      },
      toNative: function(g4) { return +(g4/4*10).toFixed(2); }
    },
    {
      id: "bd", name: "Bangladesh", flag: "🇧🇩", region: "South Asia",
      scale: "4.0 GPA Scale", scaleType: "percentage", scaleMax: 100, passMark: 40,
      creditUnit: "Credit Hours", termName: "Semester", gpaScale: "4.0 Scale",
      grades: [
        {label:"A+ (80–100)", min:80, max:100, gpa4:4.0, cls:"Excellent"},
        {label:"A  (75–79)",  min:75, max:79,  gpa4:3.75,cls:"Very Good"},
        {label:"A- (70–74)",  min:70, max:74,  gpa4:3.50,cls:"Good"},
        {label:"B+ (65–69)",  min:65, max:69,  gpa4:3.25,cls:"Good"},
        {label:"B  (60–64)",  min:60, max:64,  gpa4:3.0, cls:"Satisfactory"},
        {label:"B- (55–59)",  min:55, max:59,  gpa4:2.75,cls:"Satisfactory"},
        {label:"C+ (50–54)",  min:50, max:54,  gpa4:2.50,cls:"Average"},
        {label:"C  (45–49)",  min:45, max:49,  gpa4:2.25,cls:"Average"},
        {label:"D  (40–44)",  min:40, max:44,  gpa4:2.0, cls:"Pass"},
        {label:"F  (< 40)",   min:0,  max:39,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Bangladeshi universities use a 4.0 GPA system similar to Pakistan's HEC standard.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=80)return 4.0; if(p>=75)return 3.75; if(p>=70)return 3.5;
        if(p>=65)return 3.25;if(p>=60)return 3.0;  if(p>=55)return 2.75;
        if(p>=50)return 2.5; if(p>=45)return 2.25; if(p>=40)return 2.0;
        return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(40+(g4/4)*60,0,100)); }
    },
    {
      id: "lk", name: "Sri Lanka", flag: "🇱🇰", region: "South Asia",
      scale: "Percentage + Class", scaleType: "percentage", scaleMax: 100, passMark: 40,
      creditUnit: "Credit Hours", termName: "Semester", gpaScale: "4.0 Scale (UGC Sri Lanka)",
      grades: [
        {label:"A+ / A (75–100)", min:75, max:100, gpa4:4.0, cls:"First Class"},
        {label:"B+ (65–74)",      min:65, max:74,  gpa4:3.3, cls:"Upper Second"},
        {label:"B  (55–64)",      min:55, max:64,  gpa4:3.0, cls:"Lower Second"},
        {label:"C+ (45–54)",      min:45, max:54,  gpa4:2.0, cls:"Pass"},
        {label:"C  (40–44)",      min:40, max:44,  gpa4:1.0, cls:"Simple Pass"},
        {label:"F  (< 40)",       min:0,  max:39,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Sri Lankan universities follow the UGC credit system; First Class requires 75%+.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=75)return 4.0; if(p>=65)return 3.3; if(p>=55)return 3.0;
        if(p>=45)return 2.0; if(p>=40)return 1.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(40+(g4/4)*60,0,100)); }
    },
    {
      id: "ae", name: "UAE", flag: "🇦🇪", region: "Middle East",
      scale: "4.0 GPA (US-style)", scaleType: "percentage", scaleMax: 100, passMark: 60,
      creditUnit: "Credit Hours", termName: "Semester", gpaScale: "4.0 Scale",
      grades: [
        {label:"A (90–100)",  min:90, max:100, gpa4:4.0, cls:"Excellent"},
        {label:"B+ (85–89)",  min:85, max:89,  gpa4:3.5, cls:"Very Good"},
        {label:"B (80–84)",   min:80, max:84,  gpa4:3.0, cls:"Good"},
        {label:"C+ (75–79)",  min:75, max:79,  gpa4:2.5, cls:"Above Average"},
        {label:"C (70–74)",   min:70, max:74,  gpa4:2.0, cls:"Average"},
        {label:"D (60–69)",   min:60, max:69,  gpa4:1.0, cls:"Pass"},
        {label:"F (< 60)",    min:0,  max:59,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Many UAE universities follow US-style grading; some private institutions use UK honours.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=90)return 4.0; if(p>=85)return 3.5; if(p>=80)return 3.0;
        if(p>=75)return 2.5; if(p>=70)return 2.0; if(p>=60)return 1.0;
        return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(60+(g4/4)*40,0,100)); }
    },
    {
      id: "sa", name: "Saudi Arabia", flag: "🇸🇦", region: "Middle East",
      scale: "5.0 GPA Scale", scaleType: "percentage", scaleMax: 100, passMark: 60,
      creditUnit: "Credit Hours", termName: "Semester", gpaScale: "5.0 Scale",
      grades: [
        {label:"A (90–100)",   min:90, max:100, gpa4:5.0, cls:"Excellent"},
        {label:"B+ (85–89)",   min:85, max:89,  gpa4:4.5, cls:"Very Good"},
        {label:"B (80–84)",    min:80, max:84,  gpa4:4.0, cls:"Good"},
        {label:"C+ (75–79)",   min:75, max:79,  gpa4:3.5, cls:"Above Average"},
        {label:"C (70–74)",    min:70, max:74,  gpa4:3.0, cls:"Average"},
        {label:"D+ (65–69)",   min:65, max:69,  gpa4:2.5, cls:"Below Average"},
        {label:"D (60–64)",    min:60, max:64,  gpa4:2.0, cls:"Pass"},
        {label:"F (< 60)",     min:0,  max:59,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Saudi universities use a 5.0 GPA scale; the pass mark is typically 60%.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=90)return 4.0; if(p>=85)return 3.7; if(p>=80)return 3.3;
        if(p>=75)return 3.0; if(p>=70)return 2.5; if(p>=65)return 2.0;
        if(p>=60)return 1.3; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(60+(g4/4)*40,0,100)); }
    },
    {
      id: "qa", name: "Qatar", flag: "🇶🇦", region: "Middle East",
      scale: "4.0 GPA (US-style)", scaleType: "percentage", scaleMax: 100, passMark: 60,
      creditUnit: "Credit Hours", termName: "Semester", gpaScale: "4.0 Scale",
      grades: [
        {label:"A (93–100)",  min:93, max:100, gpa4:4.0, cls:"Excellent"},
        {label:"A- (90–92)",  min:90, max:92,  gpa4:3.7, cls:"Excellent"},
        {label:"B+ (87–89)",  min:87, max:89,  gpa4:3.3, cls:"Good"},
        {label:"B (83–86)",   min:83, max:86,  gpa4:3.0, cls:"Good"},
        {label:"B- (80–82)",  min:80, max:82,  gpa4:2.7, cls:"Good"},
        {label:"C+ (77–79)",  min:77, max:79,  gpa4:2.3, cls:"Satisfactory"},
        {label:"C (73–76)",   min:73, max:76,  gpa4:2.0, cls:"Satisfactory"},
        {label:"D (60–72)",   min:60, max:72,  gpa4:1.0, cls:"Pass"},
        {label:"F (< 60)",    min:0,  max:59,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Education City (Qatar) institutions largely follow US 4.0 GPA standards.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=93)return 4.0; if(p>=90)return 3.7; if(p>=87)return 3.3;
        if(p>=83)return 3.0; if(p>=80)return 2.7; if(p>=77)return 2.3;
        if(p>=73)return 2.0; if(p>=60)return 1.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(60+(g4/4)*40,0,100)); }
    },
    {
      id: "om", name: "Oman", flag: "🇴🇲", region: "Middle East",
      scale: "4.0 GPA Scale", scaleType: "percentage", scaleMax: 100, passMark: 50,
      creditUnit: "Credit Hours", termName: "Semester", gpaScale: "4.0 Scale",
      grades: [
        {label:"A (90–100)", min:90, max:100, gpa4:4.0, cls:"Excellent"},
        {label:"B+ (80–89)", min:80, max:89,  gpa4:3.5, cls:"Very Good"},
        {label:"B (70–79)",  min:70, max:79,  gpa4:3.0, cls:"Good"},
        {label:"C (60–69)",  min:60, max:69,  gpa4:2.0, cls:"Average"},
        {label:"D (50–59)",  min:50, max:59,  gpa4:1.0, cls:"Pass"},
        {label:"F (< 50)",   min:0,  max:49,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Omani universities generally follow a 4.0 GPA system modelled on US standards.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=90)return 4.0; if(p>=80)return 3.5; if(p>=70)return 3.0;
        if(p>=60)return 2.0; if(p>=50)return 1.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(50+(g4/4)*50,0,100)); }
    },
    {
      id: "kw", name: "Kuwait", flag: "🇰🇼", region: "Middle East",
      scale: "4.0 GPA Scale", scaleType: "percentage", scaleMax: 100, passMark: 60,
      creditUnit: "Credit Hours", termName: "Semester", gpaScale: "4.0 Scale",
      grades: [
        {label:"A (90–100)",  min:90, max:100, gpa4:4.0, cls:"Excellent"},
        {label:"B+ (85–89)",  min:85, max:89,  gpa4:3.5, cls:"Very Good"},
        {label:"B (80–84)",   min:80, max:84,  gpa4:3.0, cls:"Good"},
        {label:"C (70–79)",   min:70, max:79,  gpa4:2.0, cls:"Average"},
        {label:"D (60–69)",   min:60, max:69,  gpa4:1.0, cls:"Pass"},
        {label:"F (< 60)",    min:0,  max:59,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Kuwaiti universities follow a US-style 4.0 GPA system.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=90)return 4.0; if(p>=85)return 3.5; if(p>=80)return 3.0;
        if(p>=70)return 2.0; if(p>=60)return 1.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(60+(g4/4)*40,0,100)); }
    },
    {
      id: "sg", name: "Singapore", flag: "🇸🇬", region: "Southeast Asia",
      scale: "4.0 GPA (NUS/NTU)", scaleType: "letter4", scaleMax: 4, passMark: 1.0,
      creditUnit: "Modular Credits", termName: "Semester", gpaScale: "5.0 CAP (NUS) / 4.0",
      grades: [
        {label:"A+ (≥90%)",   min:90, max:100, gpa4:4.0, cls:"Exceptional"},
        {label:"A  (85–89%)", min:85, max:89,  gpa4:4.0, cls:"Excellent"},
        {label:"A- (80–84%)", min:80, max:84,  gpa4:3.7, cls:"Very Good"},
        {label:"B+ (75–79%)", min:75, max:79,  gpa4:3.3, cls:"Good"},
        {label:"B  (70–74%)", min:70, max:74,  gpa4:3.0, cls:"Good"},
        {label:"B- (65–69%)", min:65, max:69,  gpa4:2.7, cls:"Satisfactory"},
        {label:"C+ (60–64%)", min:60, max:64,  gpa4:2.3, cls:"Satisfactory"},
        {label:"C  (55–59%)", min:55, max:59,  gpa4:2.0, cls:"Adequate"},
        {label:"D+ (50–54%)", min:50, max:54,  gpa4:1.5, cls:"Minimum Pass"},
        {label:"D  (45–49%)", min:45, max:49,  gpa4:1.0, cls:"Minimum Pass"},
        {label:"F  (< 45%)",  min:0,  max:44,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "NUS uses a 5.0 CAP scale; NTU, SMU use 4.0. This tool maps to the common 4.0 standard.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=85)return 4.0; if(p>=80)return 3.7; if(p>=75)return 3.3;
        if(p>=70)return 3.0; if(p>=65)return 2.7; if(p>=60)return 2.3;
        if(p>=55)return 2.0; if(p>=50)return 1.5; if(p>=45)return 1.0;
        return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(45+(g4/4)*55,0,100)); }
    },
    {
      id: "my", name: "Malaysia", flag: "🇲🇾", region: "Southeast Asia",
      scale: "4.0 GPA Scale", scaleType: "percentage", scaleMax: 100, passMark: 40,
      creditUnit: "Credit Hours", termName: "Semester", gpaScale: "4.0 Scale (MQF)",
      grades: [
        {label:"A+ (90–100)", min:90, max:100, gpa4:4.0, cls:"Excellent"},
        {label:"A  (80–89)",  min:80, max:89,  gpa4:4.0, cls:"Excellent"},
        {label:"A- (75–79)",  min:75, max:79,  gpa4:3.7, cls:"Very Good"},
        {label:"B+ (70–74)",  min:70, max:74,  gpa4:3.3, cls:"Good"},
        {label:"B  (65–69)",  min:65, max:69,  gpa4:3.0, cls:"Good"},
        {label:"B- (60–64)",  min:60, max:64,  gpa4:2.7, cls:"Satisfactory"},
        {label:"C+ (55–59)",  min:55, max:59,  gpa4:2.3, cls:"Satisfactory"},
        {label:"C  (50–54)",  min:50, max:54,  gpa4:2.0, cls:"Average"},
        {label:"C- (45–49)",  min:45, max:49,  gpa4:1.7, cls:"Average"},
        {label:"D  (40–44)",  min:40, max:44,  gpa4:1.3, cls:"Pass"},
        {label:"F  (< 40)",   min:0,  max:39,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Malaysian universities follow the Malaysian Qualifications Framework (MQF) using 4.0 GPA.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=80)return 4.0; if(p>=75)return 3.7; if(p>=70)return 3.3;
        if(p>=65)return 3.0; if(p>=60)return 2.7; if(p>=55)return 2.3;
        if(p>=50)return 2.0; if(p>=45)return 1.7; if(p>=40)return 1.3;
        return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(40+(g4/4)*60,0,100)); }
    },
    {
      id: "jp", name: "Japan", flag: "🇯🇵", region: "East Asia",
      scale: "100-point with ABCDF", scaleType: "percentage", scaleMax: 100, passMark: 60,
      creditUnit: "Credits", termName: "Semester", gpaScale: "GPA 4.0 (GP method)",
      grades: [
        {label:"S / 秀 (90–100)", min:90, max:100, gpa4:4.0, cls:"Outstanding"},
        {label:"A / 優 (80–89)",  min:80, max:89,  gpa4:3.0, cls:"Excellent"},
        {label:"B / 良 (70–79)",  min:70, max:79,  gpa4:2.0, cls:"Good"},
        {label:"C / 可 (60–69)",  min:60, max:69,  gpa4:1.0, cls:"Acceptable"},
        {label:"D / F (< 60)",    min:0,  max:59,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Japanese universities often use a 100-point system mapped to S/A/B/C/F grades for GPA.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=90)return 4.0; if(p>=80)return 3.0; if(p>=70)return 2.0;
        if(p>=60)return 1.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(60+(g4/4)*40,0,100)); }
    },
    {
      id: "kr", name: "South Korea", flag: "🇰🇷", region: "East Asia",
      scale: "4.5 GPA Scale", scaleType: "percentage", scaleMax: 100, passMark: 60,
      creditUnit: "학점 (Credits)", termName: "학기 (Semester)", gpaScale: "4.5 Scale",
      grades: [
        {label:"A+ (95–100)", min:95, max:100, gpa4:4.5, cls:"Excellent"},
        {label:"A0 (90–94)",  min:90, max:94,  gpa4:4.0, cls:"Excellent"},
        {label:"B+ (85–89)",  min:85, max:89,  gpa4:3.5, cls:"Good"},
        {label:"B0 (80–84)",  min:80, max:84,  gpa4:3.0, cls:"Good"},
        {label:"C+ (75–79)",  min:75, max:79,  gpa4:2.5, cls:"Average"},
        {label:"C0 (70–74)",  min:70, max:74,  gpa4:2.0, cls:"Average"},
        {label:"D+ (65–69)",  min:65, max:69,  gpa4:1.5, cls:"Below Average"},
        {label:"D0 (60–64)",  min:60, max:64,  gpa4:1.0, cls:"Minimum Pass"},
        {label:"F  (< 60)",   min:0,  max:59,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "South Korean universities use a 4.5 GPA scale. Converted to US 4.0 by multiplying by 4/4.5.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=95)return 4.0; if(p>=90)return 3.8; if(p>=85)return 3.5;
        if(p>=80)return 3.0; if(p>=75)return 2.5; if(p>=70)return 2.0;
        if(p>=65)return 1.5; if(p>=60)return 1.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(60+(g4/4)*40,0,100)); }
    },
    {
      id: "cn", name: "China", flag: "🇨🇳", region: "East Asia",
      scale: "Percentage / 百分制", scaleType: "percentage", scaleMax: 100, passMark: 60,
      creditUnit: "学分 (Credits)", termName: "学期 (Semester)", gpaScale: "4.0 / 5.0 Scale",
      grades: [
        {label:"优秀 (90–100)",   min:90, max:100, gpa4:4.0, cls:"Excellent"},
        {label:"良好 (75–89)",    min:75, max:89,  gpa4:3.0, cls:"Good"},
        {label:"中等 (65–74)",    min:65, max:74,  gpa4:2.0, cls:"Average"},
        {label:"及格 (60–64)",    min:60, max:64,  gpa4:1.0, cls:"Pass"},
        {label:"不及格 (< 60)",   min:0,  max:59,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Chinese universities use percentage marking; the 4.0 GPA equivalent varies by institution.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=90)return 4.0; if(p>=75)return 3.0; if(p>=65)return 2.0;
        if(p>=60)return 1.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(60+(g4/4)*40,0,100)); }
    },
    {
      id: "au", name: "Australia", flag: "🇦🇺", region: "Oceania",
      scale: "High Distinction – Fail", scaleType: "percentage", scaleMax: 100, passMark: 50,
      creditUnit: "Credit Points", termName: "Semester", gpaScale: "7-point AQF GPA",
      grades: [
        {label:"HD  High Distinction (85–100)", min:85, max:100, gpa4:4.0, cls:"High Distinction"},
        {label:"D   Distinction (75–84)",        min:75, max:84,  gpa4:3.5, cls:"Distinction"},
        {label:"Cr  Credit (65–74)",             min:65, max:74,  gpa4:3.0, cls:"Credit"},
        {label:"P   Pass (50–64)",               min:50, max:64,  gpa4:2.0, cls:"Pass"},
        {label:"F   Fail (< 50)",                min:0,  max:49,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "Australian universities use a 7-point GPA scale; HD (≥85%) is the highest achievement.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=85)return 4.0; if(p>=75)return 3.5; if(p>=65)return 3.0;
        if(p>=50)return 2.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(50+(g4/4)*50,0,100)); }
    },
    {
      id: "nz", name: "New Zealand", flag: "🇳🇿", region: "Oceania",
      scale: "Percentage + Grade", scaleType: "percentage", scaleMax: 100, passMark: 50,
      creditUnit: "Credits (NZQF)", termName: "Semester", gpaScale: "9-point GPA",
      grades: [
        {label:"A+ (90–100)", min:90, max:100, gpa4:4.0, cls:"Outstanding"},
        {label:"A  (85–89)",  min:85, max:89,  gpa4:4.0, cls:"Excellent"},
        {label:"A- (80–84)",  min:80, max:84,  gpa4:3.7, cls:"Very Good"},
        {label:"B+ (75–79)",  min:75, max:79,  gpa4:3.3, cls:"Good"},
        {label:"B  (70–74)",  min:70, max:74,  gpa4:3.0, cls:"Good"},
        {label:"B- (65–69)",  min:65, max:69,  gpa4:2.7, cls:"Satisfactory"},
        {label:"C+ (60–64)",  min:60, max:64,  gpa4:2.3, cls:"Satisfactory"},
        {label:"C  (55–59)",  min:55, max:59,  gpa4:2.0, cls:"Adequate"},
        {label:"D  (50–54)",  min:50, max:54,  gpa4:1.0, cls:"Minimum Pass"},
        {label:"E  (< 50)",   min:0,  max:49,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "New Zealand institutions use NZQF credits; most universities publish a 9-point GPA scale.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=85)return 4.0; if(p>=80)return 3.7; if(p>=75)return 3.3;
        if(p>=70)return 3.0; if(p>=65)return 2.7; if(p>=60)return 2.3;
        if(p>=55)return 2.0; if(p>=50)return 1.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(50+(g4/4)*50,0,100)); }
    },
    {
      id: "za", name: "South Africa", flag: "🇿🇦", region: "Africa",
      scale: "Percentage + Symbol", scaleType: "percentage", scaleMax: 100, passMark: 50,
      creditUnit: "Credits (HEQF)", termName: "Semester", gpaScale: "Cum Laude ≥ 75%",
      grades: [
        {label:"75–100 Cum Laude / Distinction",  min:75, max:100, gpa4:4.0, cls:"Distinction"},
        {label:"70–74  Merit",                     min:70, max:74,  gpa4:3.7, cls:"Merit"},
        {label:"60–69  Credit / Upper Pass",        min:60, max:69,  gpa4:3.0, cls:"Credit"},
        {label:"50–59  Pass",                       min:50, max:59,  gpa4:2.0, cls:"Pass"},
        {label:"< 50   Fail",                       min:0,  max:49,  gpa4:0.0, cls:"Fail"}
      ],
      tip: "South African universities follow the HEQF framework; Cum Laude typically requires 75%+.",
      toGPA4: function(p) {
        p=clamp(+p,0,100);
        if(p>=75)return 4.0; if(p>=70)return 3.7; if(p>=60)return 3.0;
        if(p>=50)return 2.0; return 0.0;
      },
      toNative: function(g4) { return Math.round(clamp(50+(g4/4)*50,0,100)); }
    }
  ];
  var BY_ID = {};
  SYSTEMS.forEach(function(s) { BY_ID[s.id] = s; });
  var REGIONS = {};
  SYSTEMS.forEach(function(s) {
    if (!REGIONS[s.region]) REGIONS[s.region] = [];
    REGIONS[s.region].push(s);
  });
  var PREF_KEY = "sm_country";
  return {
    all: SYSTEMS,
    get: function(id) { return BY_ID[id] || null; },
    regions: REGIONS,
    save: function(id) {
      try { localStorage.setItem(PREF_KEY, id); } catch(e) {}
    },
    load: function() {
      try { return localStorage.getItem(PREF_KEY) || "us"; } catch(e) { return "us"; }
    }
  };
})();