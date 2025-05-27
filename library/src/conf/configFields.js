const configFields = {
  "aeroOptThick": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.2,
          1
        ],
        "colors": [
          "rgba(255,255,255,0)",
          "rgba(255,254,224,0.7)",
          "rgba(105,37,6,1)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0.1,
          0.2,
          0.3,
          0.4,
          0.5,
          0.6,
          0.7,
          0.8,
          0.9,
          1
        ],
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -0.7,
          -0.6,
          -0.5,
          -0.4,
          -0.3,
          -0.2,
          -0.1,
          0.1,
          0.2,
          0.3,
          0.4,
          0.5,
          0.6,
          0.7
        ]
      }
    },
    "colorPrimary": "var(--graphcolorlight)",
    "isZeroLowerBound": true,
    "nameLegend": "Aerosol Optical Thickness",
    "namePublic": "Aerosol Optical Thickness",
    "nameShort": "AOT",
    "roundto": 2,
    "units": ""
  },
  "bposelay": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          100,
          300,
          600,
          900,
          1200
        ],
        "colors": [
          "rgba(0,0,0,0)",
          "rgb(255,255,0)",
          "rgb(255,165,0)",
          "rgb(255,0,0)",
          "rgb(178,34,34)",
          "rgb(140,1,1)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0,
          100,
          200,
          300,
          400,
          500,
          600,
          700,
          800,
          900,
          1000
        ],
        "isLeftCap": false,
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -350,
          -300,
          -250,
          -200,
          -150,
          -100,
          -50,
          50,
          100,
          150,
          200,
          250,
          300,
          350
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          100,
          200,
          300,
          400,
          500
        ]
      }
    },
    "colorPrimary": "rgb(200,50,0)",
    "nameLegend": "Positive Warm Nose Aloft",
    "namePublic": "Bourgouin Pos",
    "nameShort": "Bourgouin Pos",
    "roundto": 0,
    "units": "J/kg"
  },
  "bnegelay": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          -500,
          -200,
          -50,
          0
        ],
        "colors": [
          "rgb(173,0,255)",
          "rgb(0,50,255)",
          "rgb(135,233,255)",
          "rgba(0,0,0,0)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          -500,
          -400,
          -300,
          -200,
          -100,
          0
        ],
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -350,
          -300,
          -250,
          -200,
          -150,
          -100,
          -50,
          50,
          100,
          150,
          200,
          250,
          300,
          350
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          100,
          200,
          300,
          400,
          500
        ]
      }
    },
    "colorPrimary": "rgb(200,50,0)",
    "nameLegend": "Negative Near Surface Cold Layer",
    "namePublic": "Bourgouin Neg",
    "nameShort": "Bourgouin Neg",
    "roundto": 0,
    "units": "J/kg"
  },
  "ceiling": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0.1,
          0.2,
          0.3,
          0.4,
          0.5,
          0.7,
          1,
          1.5,
          2,
          2.5,
          3,
          5,
          10,
          15,
          20,
          30
        ],
        "colors": [
          "rgb(164,43,163)",
          "rgb(164,43,163)",
          "rgb(190,80,190)",
          "rgb(220,120,210)",
          "rgb(255,153,255)",
          "rgb(220,75,125)",
          "rgb(200,0,0)",
          "rgb(220,180,10)",
          "rgb(255,255,0)",
          "rgb(255,255,100)",
          "rgb(255,255,200)",
          "rgb(100,100,100)",
          "rgb(150,150,150)",
          "rgb(175,175,175)",
          "rgb(200,200,200)",
          "rgb(225,225,225)",
          "rgba(0,0,0,0)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          0.1,
          0.2,
          0.3,
          0.4,
          0.5,
          0.7,
          1,
          1.5,
          2,
          2.5,
          3,
          5,
          10,
          15,
          30
        ],
        "isLeftCap": true,
        "ticks": "byColorLevels"
      }
    },
    "colorPrimary": "rgb(140,140,160)",
    "nameLegend": "Ceiling Height",
    "namePublic": "Ceiling Height",
    "nameShort": "Ceil",
    "roundto": 1,
    "units": "kft"
  },
  "dustFineSfc": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          1,
          25,
          100,
          200,
          250
        ],
        "colors": [
          "rgba(0,0,0,0)",
          "rgba(0,0,0,0)",
          "rgb(255, 240, 204)",
          "rgb(252, 229, 184)",
          "rgb(172, 120, 0)",
          "rgb(78, 49, 14)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          5,
          25,
          50,
          100,
          150,
          200,
          250
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(200,153,100)",
    "nameLegend": "Near Surface Fine Dust",
    "namePublic": "Near Surface Fine Dust",
    "nameShort": "Fine Dust",
    "roundto": 0,
    "units": "µg/m^3"
  },
  "dustFineVI": {
    "defaults": "dustFineSfc",
    "colorPrimary": "rgb(135,90,50)",
    "nameLegend": "Vertically Integrated Fine Dust",
    "namePublic": "Vertically Integrated Fine Dust",
    "nameShort": "Fine Dust VI",
    "units": "mg/m^2"
  },
  "dustCoarseSfc": {
    "defaults": "dustFineSfc",
    "colorPrimary": "rgb(200,153,100)",
    "nameLegend": "Near Surface Coarse Dust",
    "namePublic": "Near Surface Coarse Dust",
    "nameShort": "Coarse Dust",
    "units": "µg/m^3"
  },
  "dustCoarseVI": {
    "defaults": "dustFineSfc",
    "colorPrimary": "rgb(135,90,50)",
    "nameLegend": "Vertically Integrated Coarse Dust",
    "namePublic": "Vertically Integrated Coarse Dust",
    "nameShort": "Coarse Dust",
    "units": "mg/m^2"
  },
  "lcl": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0.1,
          0.2,
          0.3,
          0.4,
          0.5,
          0.7,
          1,
          1.5,
          2,
          3,
          4,
          5,
          6,
          8,
          10,
          12,
          14
        ],
        "colors": [
          "rgb(164,43,163)",
          "rgb(164,43,163)",
          "rgb(190,80,190)",
          "rgb(220,120,210)",
          "rgb(255,153,255)",
          "rgb(220,75,125)",
          "rgb(200,0,0)",
          "rgb(220,180,10)",
          "rgb(255,255,0)",
          "rgb(255,255,100)",
          "rgb(255,255,200)",
          "rgb(75,75,75)",
          "rgb(100,100,100)",
          "rgb(150,150,150)",
          "rgb(200,200,200)",
          "rgb(225,225,225)",
          "rgb(245,245,245)",
          "rgba(255,255,255,0.75)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          0.1,
          0.2,
          0.3,
          0.4,
          0.5,
          0.7,
          1,
          1.5,
          2,
          3,
          4,
          5,
          6,
          8,
          10,
          12,
          14
        ],
        "isLeftCap": true,
        "ticks": "byColorLevels"
      }
    },
    "colorPrimary": "rgb(140,140,160)",
    "nameLegend": "LCL",
    "namePublic": "LCL",
    "nameShort": "LCL",
    "roundto": 1,
    "units": "kft"
  },
  "cloudBase": {
    "defaults": "ceiling",
    "colorPrimary": "rgb(210,210,210)",
    "nameLegend": "Lowest Cloud Base",
    "namePublic": "Lowest Cloud Base"
  },
  "CWASP": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          20,
          40,
          60,
          80,
          100
        ],
        "colors": [
          "rgb(0,0,0,0)",
          "rgb(94,197,83)",
          "rgb(255,247,0)",
          "rgb(255,14,22)",
          "rgb(149,0,149)",
          "rgb(180,160,255)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0,
          20,
          40,
          60,
          80,
          100
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(200,0,200)",
    "nameLegend": "CWASP",
    "namePublic": "CWASP",
    "nameShort": "CWASP",
    "roundto": 0,
    "units": "%"
  },
  "cape": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          10,
          100,
          500,
          1000,
          2000,
          3000,
          5000
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgba(191,191,191,200)",
          "rgb(244,242,168)",
          "rgb(224,119,48)",
          "rgb(192,0,0)",
          "rgb(120,34,150)",
          "rgb(212,105,182)",
          "rgb(255,255,255)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0,
          10,
          100,
          500,
          1000,
          2000,
          3000,
          5000
        ],
        "isLeftCap": false,
        "ticks": "byColorLevels"
      },
      "difference": {
        "colorLevels": [
          -2000,
          -1500,
          -1000,
          -800,
          -600,
          -400,
          -200,
          200,
          400,
          600,
          800,
          1000,
          1500,
          2000
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          100,
          200,
          300,
          400,
          500
        ]
      }
    },
    "colorPrimary": "rgb(255,150,0)",
    "nameLegend": "Surface CAPE",
    "namePublic": "CAPE",
    "nameShort": "CAPE",
    "roundto": 0,
    "units": "J/kg"
  },
  "cin": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          -500,
          -300,
          -200,
          -100,
          -50,
          -20
        ],
        "colors": [
          "rgb(212,105,182)",
          "rgb(120,34,150)",
          "rgb(192,0,0)",
          "rgb(224,119,48)",
          "rgb(244,242,168)",
          "rgba(0,0,0,0)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          -500,
          -300,
          -200,
          -100,
          -50
        ],
        "isRightCap": false,
        "ticks": "byColorLevels"
      },
      "difference": {
        "colorLevels": [
          -600,
          -500,
          -400,
          -300,
          -200,
          -100,
          -500,
          50,
          100,
          200,
          300,
          400,
          500,
          600
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          100,
          200,
          300,
          400,
          500
        ]
      }
    },
    "colorPrimary": "rgb(255,255,0)",
    "nameLegend": "Surface CIN",
    "namePublic": "CIN",
    "nameShort": "CIN",
    "roundto": 0,
    "units": "J/kg"
  },
  "ellrod": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          1,
          2,
          3,
          4
        ],
        "colors": [
          "rgb(150,150,150,0.0)",
          "rgb(255,255,0)",
          "rgb(253,160,0)",
          "rgb(243,70,0)",
          "rgb(220,44,2)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          1,
          2,
          3,
          4,
          5
        ],
        "isLeftCap": true,
        "ticks": "byColorLevels"
      }
    },
    "colorPrimary": "rgb(255,255,0)",
    "nameLegend": "Ellrod Index",
    "namePublic": "Ellrod Index",
    "nameShort": "Ellrod",
    "roundto": 0,
    "units": ""
  },
  "fosberg": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          25,
          50,
          75,
          100
        ],
        "colors": [
          "rgba(255,233,255,0)",
          "rgb(255,233,255)",
          "rgb(248,111,85)",
          "rgb(253,158,0)",
          "rgb(255,255,0)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          25,
          50,
          75,
          100
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(201,114,93)",
    "nameLegend": "Fosberg Index",
    "namePublic": "Fosberg Index",
    "nameShort": "Fosberg",
    "roundto": 0,
    "units": ""
  },
  "frzr1": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.001,
          0.05,
          0.1,
          0.15,
          0.2,
          0.25,
          0.3
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgba(150,150,150,0)",
          "rgb(243,234,59)",
          "rgb(255,192,0)",
          "rgb(255,0,0)",
          "rgb(192,0,0)",
          "rgb(153,102,255)",
          "rgb(114,10,200)",
          "rgb(36,5,91)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          0.01,
          0.05,
          0.1,
          0.15,
          0.2,
          0.25,
          0.3
        ],
        "isLeftCap": false,
        "ticks": "byColorLevels"
      },
      "spread": {
        "colorLevels": [
          0,
          0.01,
          0.05,
          0.1,
          0.15,
          0.2
        ]
      }
    },
    "colorPrimary": "rgb(255, 100, 255)",
    "nameLegend": "1 Hour Freezing Rain",
    "namePublic": "1 Hour Freezing Rain",
    "nameShort": "Frzr",
    "roundto": 2,
    "units": "in"
  },
  "frzr6": {
    "defaults": "frzr1",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.001,
          0.05,
          0.1,
          0.15,
          0.2,
          0.25,
          0.5
        ],
        "contourLevels": [
          0.01,
          0.05,
          0.1,
          0.15,
          0.2,
          0.25,
          0.5
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          0.01,
          0.05,
          0.1,
          0.15,
          0.2
        ]
      }
    },
    "nameLegend": "6 Hour Freezing Rain",
    "namePublic": "6 Hour Freezing Rain"
  },
  "frzr24": {
    "defaults": "frzr1",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          2
        ],
        "contourLevels": [
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          2
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          0.05,
          0.1,
          0.25,
          0.5,
          1
        ]
      }
    },
    "nameLegend": "24 Hour Freezing Rain",
    "namePublic": "24 Hour Freezing Rain"
  },
  "frzr48": {
    "defaults": "frzr24",
    "nameLegend": "48 Hour Freezing Rain",
    "namePublic": "48 Hour Freezing Rain"
  },
  "frzr72": {
    "defaults": "frzr24",
    "nameLegend": "72 Hour Freezing Rain",
    "namePublic": "72 Hour Freezing Rain"
  },
  "frzrtotal": {
    "defaults": "frzr24",
    "nameLegend": "Accumulated Freezing Rain",
    "namePublic": "Accumulated Freezing Rain"
  },
  "frzrSpray": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          1,
          2,
          3,
          4
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgba(150,150,150,0)",
          "rgb(64,202,52)",
          "rgb(246,247,41)",
          "rgb(244,172,42)",
          "rgb(255,0,0)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          1,
          2,
          3,
          4
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(247,255,59)",
    "isZeroLowerBound": true,
    "nameLegend": "Freezing Spray",
    "namePublic": "Freezing Spray",
    "nameShort": "Frzr Spray",
    "roundto": 0,
    "units": ""
  },
  "front700": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          -6.5,
          -5.5,
          -4.5,
          -3.5,
          -2.5,
          -1.5,
          -0.5,
          0.5,
          1.5,
          2.5,
          3.5,
          4.5,
          5.5,
          6.5
        ],
        "colors": [
          "rgb(0,0,70)",
          "rgb(36,56,119)",
          "rgb(68,106,161)",
          "rgb(100,152,195)",
          "rgb(132,185,216)",
          "rgb(164,207,228)",
          "rgba(194,227,239,200)",
          "rgba(255,255,255,0)",
          "rgba(254,195,118,200)",
          "rgb(252,163,95)",
          "rgb(247,128,76)",
          "rgb(234,93,59)",
          "rgb(199,61,41)",
          "rgb(148,29,24)",
          "rgb(84,0,0)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          -5,
          -4,
          -3,
          -2,
          -1,
          1,
          2,
          3,
          4,
          5
        ],
        "ticks": "linear"
      }
    },
    "colorPrimary": "var(--fontcolor)",
    "nameLegend": "700 mb Frontogenesis",
    "namePublic": "700 mb Frontogenesis",
    "nameShort": "700mb fgen",
    "roundto": 1,
    "units": "K/100km/3h"
  },
  "front850": {
    "defaults": "front700",
    "nameLegend": "850 mb Frontogenesis",
    "namePublic": "850 mb Frontogenesis",
    "nameShort": "850mb fgen"
  },
  "vort500": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          10,
          25,
          50
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgb(255,255,42)",
          "rgb(255,80,0)",
          "rgb(88,0,0)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          10,
          20,
          30,
          40,
          50
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "var(--fontcolor)",
    "nameLegend": "500 mb Vorticity",
    "namePublic": "500 mb Vorticity",
    "nameShort": "500mb Vort",
    "roundto": 0,
    "units": "1/s"
  },
  "gh250": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          996,
          1044,
          1092,
          1140
        ],
        "colors": [
          "rgb(93,40,134)",
          "rgb(0,112,192)",
          "rgb(253,255,153)",
          "rgb(192,0,0)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          996,
          1008,
          1020,
          1032,
          1044,
          1056,
          1068,
          1080,
          1092,
          1104,
          1116,
          1128,
          1140
        ],
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -28,
          -24,
          -20,
          -16,
          -12,
          -8,
          -4,
          4,
          8,
          12,
          16,
          20,
          24,
          28
        ]
      }
    },
    "colorPrimary": "var(--fontcolor)",
    "nameLegend": "250 mb Height",
    "namePublic": "250 mb Height",
    "nameShort": "250mb Hgt",
    "roundto": 1,
    "roundtoReadout": 0,
    "units": "dam"
  },
  "gh300": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          880,
          920,
          960,
          980
        ],
        "colors": [
          "rgb(93,40,134)",
          "rgb(0,112,192)",
          "rgb(253,255,153)",
          "rgb(192,0,0)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          880,
          920,
          980
        ],
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -20,
          -15,
          -10,
          -8,
          -6,
          -4,
          -2,
          2,
          4,
          6,
          8,
          10,
          15,
          20
        ]
      }
    },
    "colorPrimary": "var(--fontcolor)",
    "nameLegend": "300 mb Height",
    "namePublic": "300 mb Height",
    "nameShort": "300mb Hgt",
    "roundto": 1,
    "roundtoReadout": 0,
    "units": "dam"
  },
  "gh500": {
    "defaults": "gh300",
    "colorBars": {
      "default": {
        "colorLevels": [
          500,
          540,
          580,
          600
        ],
        "contourLevels": [
          498,
          504,
          510,
          516,
          522,
          528,
          534,
          540,
          546,
          552,
          558,
          564,
          570,
          576,
          582,
          588,
          594,
          600,
          606,
          612,
          618,
          624
        ]
      }
    },
    "nameLegend": "500 mb Height",
    "namePublic": "500 mb Height",
    "nameShort": "500 mb Hgt"
  },
  "gh1000-gh500": {
    "defaults": "gh300",
    "colorBars": {
      "default": {
        "colorLevels": [
          516,
          522,
          528,
          534,
          540,
          546,
          552,
          558,
          564
        ],
        "colors": [
          "rgb(5,48,97)",
          "rgb(33,102,172)",
          "rgb(67,147,195)",
          "rgb(146,197,222)",
          "rgb(209,229,240)",
          "rgb(253,219,199)",
          "rgb(244,165,130)",
          "rgb(214,96,77)",
          "rgb(178,24,43)",
          "rgb(103,0,31)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          468,
          474,
          480,
          486,
          492,
          498,
          504,
          510,
          516,
          522,
          528,
          534,
          540,
          546,
          552,
          558,
          564,
          570,
          576,
          582,
          588,
          594,
          600,
          606,
          612,
          618
        ],
        "ticks": "byColorLevels"
      }
    },
    "nameLegend": "1000-500 mb Thickness",
    "namePublic": "1000-500 mb Thickness",
    "nameShort": "1000-500 mb Tkns"
  },
  "gh700-gh500_lr": {
    "defaults": "gh300",
    "colorBars": {
      "default": {
        "colorLevels": [
          4,
          5,
          6,
          6.5,
          7,
          7.5,
          8,
          8.5,
          9
        ],
        "colors": [
          "rgb(5,48,97)",
          "rgb(33,102,172)",
          "rgb(67,147,195)",
          "rgb(146,197,222)",
          "rgb(209,229,240)",
          "rgb(253,219,199)",
          "rgb(244,165,130)",
          "rgb(214,96,77)",
          "rgb(178,24,43)",
          "rgb(103,0,31)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          4,
          5,
          6,
          6.5,
          7,
          7.5,
          8,
          8.5,
          9
        ],
        "ticks": "byColorLevels"
      },
      "spread": {
        "colorLevels": [
          0,
          0.5,
          1,
          1.5,
          2,
          2.5,
          3
        ]
      }
    },
    "nameLegend": "700-500 mb Lapse Rate",
    "namePublic": "700-500 mb Lapse Rate",
    "nameShort": "700-500 mb LR",
    "roundto": 2,
    "roundtoReadout": 1,
    "units": "C/km"
  },
  "thte850": {
    "defaults": "gh300",
    "colorBars": {
      "default": {
        "colorLevels": [
          276,
          279,
          282,
          285,
          288,
          291,
          294,
          297,
          300,
          303,
          306,
          309,
          312,
          315,
          318,
          321,
          324,
          327,
          330,
          333,
          336,
          339,
          342,
          345,
          348,
          351,
          354,
          357
        ],
        "colors": [
          "rgb(218,218,235)",
          "rgb(201,199,224)",
          "rgb(185,183,217)",
          "rgb(173,159,204)",
          "rgb(119,159,200)",
          "rgb(133,177,214)",
          "rgb(151,195,223)",
          "rgb(173,210,232)",
          "rgb(201, 225, 238)",
          "rgb(223,235,246)",
          "rgb(134,191,153)",
          "rgb(150,208,166)",
          "rgb(178,222,179)",
          "rgb(204,234,201)",
          "rgb(224,242,220)",
          "rgb(240,249,238)",
          "rgb(254,241,228)",
          "rgb(253,229,204)",
          "rgb(253, 210, 173)",
          "rgb(253, 192, 148)",
          "rgb(252,173,155)",
          "rgb(246,147,139)",
          "rgb(226,128,131)",
          "rgb(206,123,126)",
          "rgb(185, 183, 217)",
          "rgb(201,199,224)",
          "rgb(218,218,235)",
          "rgb(234,234,244)",
          "rgb(246, 245, 249)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          273,
          276,
          279,
          282,
          285,
          288,
          291,
          294,
          297,
          300,
          303,
          306,
          309,
          312,
          315,
          318,
          321,
          324,
          327,
          330,
          333,
          336,
          339,
          342,
          345,
          348,
          351,
          354,
          357
        ],
        "ticks": "byColorLevels"
      },
      "spread": {
        "colorLevels": [
          0,
          5,
          10,
          15,
          20,
          25,
          30
        ]
      }
    },
    "nameLegend": "850 mb Equivalent Potential Temperature",
    "namePublic": "850 mb Equivalent Potential Temperature",
    "nameShort": "850 mb Theta-E",
    "units": "K"
  },
  "thte925": {
    "defaults": "gh300",
    "colorBars": {
      "default": {
        "colorLevels": [
          276,
          279,
          282,
          285,
          288,
          291,
          294,
          297,
          300,
          303,
          306,
          309,
          312,
          315,
          318,
          321,
          324,
          327,
          330,
          333,
          336,
          339,
          342,
          345,
          348,
          351,
          354,
          357
        ],
        "colors": [
          "rgb(218,218,235)",
          "rgb(201,199,224)",
          "rgb(185,183,217)",
          "rgb(173,159,204)",
          "rgb(119,159,200)",
          "rgb(133,177,214)",
          "rgb(151,195,223)",
          "rgb(173,210,232)",
          "rgb(201, 225, 238)",
          "rgb(223,235,246)",
          "rgb(134,191,153)",
          "rgb(150,208,166)",
          "rgb(178,222,179)",
          "rgb(204,234,201)",
          "rgb(224,242,220)",
          "rgb(240,249,238)",
          "rgb(254,241,228)",
          "rgb(253,229,204)",
          "rgb(253, 210, 173)",
          "rgb(253, 192, 148)",
          "rgb(252,173,155)",
          "rgb(246,147,139)",
          "rgb(226,128,131)",
          "rgb(206,123,126)",
          "rgb(185, 183, 217)",
          "rgb(201,199,224)",
          "rgb(218,218,235)",
          "rgb(234,234,244)",
          "rgb(246, 245, 249)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          276,
          279,
          282,
          285,
          288,
          291,
          294,
          297,
          300,
          303,
          306,
          309,
          312,
          315,
          318,
          321,
          324,
          327,
          330,
          333,
          336,
          339,
          342,
          345,
          348,
          351,
          354,
          357
        ],
        "ticks": "byColorLevels"
      },
      "spread": {
        "colorLevels": [
          0,
          5,
          10,
          15,
          20,
          25,
          30
        ]
      }
    },
    "nameLegend": "925 mb Equivalent Potential Temperature",
    "namePublic": "925 mb Equivalent Potential Temperature",
    "nameShort": "925 mb Theta-E",
    "units": "K"
  },
  "thte2": {
    "defaults": "gh300",
    "colorBars": {
      "default": {
        "colorLevels": [
          276,
          279,
          282,
          285,
          288,
          291,
          294,
          297,
          300,
          303,
          306,
          309,
          312,
          315,
          318,
          321,
          324,
          327,
          330,
          333,
          336,
          339,
          342,
          345,
          348,
          351,
          354,
          357
        ],
        "colors": [
          "rgb(218,218,235)",
          "rgb(201,199,224)",
          "rgb(185,183,217)",
          "rgb(173,159,204)",
          "rgb(119,159,200)",
          "rgb(133,177,214)",
          "rgb(151,195,223)",
          "rgb(173,210,232)",
          "rgb(201, 225, 238)",
          "rgb(223,235,246)",
          "rgb(134,191,153)",
          "rgb(150,208,166)",
          "rgb(178,222,179)",
          "rgb(204,234,201)",
          "rgb(224,242,220)",
          "rgb(240,249,238)",
          "rgb(254,241,228)",
          "rgb(253,229,204)",
          "rgb(253, 210, 173)",
          "rgb(253, 192, 148)",
          "rgb(252,173,155)",
          "rgb(246,147,139)",
          "rgb(226,128,131)",
          "rgb(206,123,126)",
          "rgb(185, 183, 217)",
          "rgb(201,199,224)",
          "rgb(218,218,235)",
          "rgb(234,234,244)",
          "rgb(246, 245, 249)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          276,
          279,
          282,
          285,
          288,
          291,
          294,
          297,
          300,
          303,
          306,
          309,
          312,
          315,
          318,
          321,
          324,
          327,
          330,
          333,
          336,
          339,
          342,
          345,
          348,
          351,
          354,
          357
        ],
        "ticks": "byColorLevels"
      },
      "spread": {
        "colorLevels": [
          0,
          5,
          10,
          15,
          20,
          25,
          30
        ]
      }
    },
    "nameLegend": "Surface Equivalent Potential Temperature",
    "namePublic": "Surface Equivalent Potential Temperature",
    "nameShort": "Surface Theta-E",
    "units": "K"
  },
  "gh700": {
    "defaults": "gh300",
    "colorBars": {
      "default": {
        "colorLevels": [
          260,
          280,
          310,
          330
        ],
        "contourLevels": [
          261,
          264,
          267,
          270,
          273,
          276,
          279,
          282,
          285,
          288,
          291,
          294,
          297,
          300,
          303,
          306,
          309,
          312,
          315,
          318,
          321,
          324,
          327,
          330
        ]
      }
    },
    "nameLegend": "700 mb Height",
    "namePublic": "700 mb Height",
    "nameShort": "700mb Hgt"
  },
  "gh850": {
    "defaults": "gh300",
    "colorBars": {
      "default": {
        "colorLevels": [
          120,
          132,
          147,
          165
        ],
        "contourLevels": [
          120,
          123,
          126,
          129,
          132,
          135,
          138,
          141,
          144,
          147,
          150,
          153,
          156,
          159,
          162,
          165
        ]
      }
    },
    "nameLegend": "850 mb Height",
    "namePublic": "850 mb Height",
    "nameShort": "850mb Hgt"
  },
  "gh925": {
    "defaults": "gh300",
    "colorBars": {
      "default": {
        "colorLevels": [
          45,
          63,
          78,
          87
        ],
        "contourLevels": [
          33,
          36,
          39,
          42,
          45,
          48,
          51,
          54,
          57,
          60,
          63,
          66,
          69,
          72,
          75,
          78,
          81,
          84,
          87,
          90,
          93,
          96,
          99
        ]
      }
    },
    "nameLegend": "925 mb Height",
    "namePublic": "925 mb Height",
    "nameShort": "925mb Hgt"
  },
  "gh_isobaric": {
    "defaults": "gh500"
  },
  "haines06": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgba(150,150,150,0)",
          "rgb(64,202,52)",
          "rgb(246,247,41)",
          "rgb(244,172,42)",
          "rgb(255,0,0)",
          "rgb(150,0,0)",
          "rgb(200,0,200)",
          "rgb(255,255,255)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          1,
          2,
          3,
          4
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(247,135,59)",
    "isZeroLowerBound": true,
    "nameLegend": "Haines",
    "namePublic": "Haines",
    "nameShort": "Haines",
    "roundto": 0,
    "units": ""
  },
  "srh0-1km": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          25,
          30,
          35,
          40,
          45,
          50,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160,
          180,
          200,
          240,
          280,
          320,
          360,
          400,
          450,
          500,
          600,
          700,
          800
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgb(204,204,204)",
          "rgb(178,178,178)",
          "rgb(153,153,153)",
          "rgb(127,127,127)",
          "rgb(102,102,102)",
          "rgb(127,178,255)",
          "rgb(102,146,235)",
          "rgb(76,114,216)",
          "rgb(50,82,197)",
          "rgb(25,51,178)",
          "rgb(127,255,127)",
          "rgb(98,216,98)",
          "rgb(70,178,70)",
          "rgb(41,140,41)",
          "rgb(12,102,12)",
          "rgb(255,255,102)",
          "rgb(232,197,76)",
          "rgb(210,140,51)",
          "rgb(188,82,25)",
          "rgb(165,25,0)",
          "rgb(255,153,255)",
          "rgb(224,123,224)",
          "rgb(193,94,193)",
          "rgb(132,36,132)",
          "rgb(102,7,102)",
          "rgb(102,7,102)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          25,
          50,
          100,
          200,
          400,
          800
        ],
        "isLeftCap": false,
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -175,
          -150,
          -125,
          -100,
          -75,
          -50,
          -25,
          25,
          50,
          75,
          100,
          125,
          150,
          175
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          25,
          50,
          100,
          150,
          200
        ]
      }
    },
    "colorPrimary": "rgb(250,0,140)",
    "nameLegend": "0-1km SRH",
    "namePublic": "0-1km SRH",
    "nameShort": "0-1km SRH",
    "roundto": 0,
    "units": "m^2/s^2"
  },
  "srh0-3km": {
    "defaults": "srh0-1km",
    "colorPrimary": "rgb(200,0,100)",
    "nameLegend": "0-3km SRH",
    "namePublic": "0-3km SRH",
    "nameShort": "0-3km SRH"
  },
  "stp": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0.1,
          0.2,
          0.4,
          0.6,
          0.8,
          1,
          1.2,
          1.4,
          1.6,
          1.8,
          2,
          2.4,
          2.8,
          3.2,
          3.6,
          4,
          4.4,
          4.8,
          5.2,
          5.6,
          6,
          6.4,
          6.8,
          7.2,
          7.6,
          8
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgb(204,204,204)",
          "rgb(178,178,178)",
          "rgb(153,153,153)",
          "rgb(127,127,127)",
          "rgb(102,102,102)",
          "rgb(127,178,255)",
          "rgb(102,146,235)",
          "rgb(76,114,216)",
          "rgb(50,82,197)",
          "rgb(25,51,178)",
          "rgb(127,255,127)",
          "rgb(98,216,98)",
          "rgb(70,178,70)",
          "rgb(41,140,41)",
          "rgb(12,102,12)",
          "rgb(255,255,102)",
          "rgb(232,197,76)",
          "rgb(210,140,51)",
          "rgb(188,82,25)",
          "rgb(165,25,0)",
          "rgb(255,153,255)",
          "rgb(224,123,224)",
          "rgb(193,94,193)",
          "rgb(132,36,132)",
          "rgb(102,7,102)",
          "rgb(102,7,102)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          0.1,
          0.2,
          0.3,
          0.4,
          0.5,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8
        ],
        "isLeftCap": false,
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -1.4,
          -1.2,
          -1,
          -0.8,
          -0.6,
          -0.4,
          -0.2,
          0.2,
          0.4,
          0.6,
          0.8,
          1,
          1.2,
          1.4
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          0.2,
          0.4,
          0.6,
          0.8,
          1
        ]
      }
    },
    "colorPrimary": "rgb(250,0,0)",
    "nameLegend": "STP (fixed layer)",
    "namePublic": "STP (fixed layer)",
    "nameShort": "STP",
    "roundto": 1,
    "units": ""
  },
  "ltng": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0.01,
          0.02,
          0.5,
          1,
          2,
          4,
          5
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgb(255,255,255)",
          "rgb(255,200,100)",
          "rgb(255, 195, 0)",
          "rgb(199, 0, 57)",
          "rgb(200, 0, 200)",
          "rgb(100, 0, 100)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0.01,
          0.02,
          0.5,
          1,
          2,
          4,
          5,
          10
        ],
        "isLeftCap": false,
        "ticks": "byColorLevels"
      },
      "difference": {
        "colorLevels": [
          -6,
          -5,
          -4,
          -3,
          -2,
          -1,
          -0.5,
          0.5,
          1,
          2,
          3,
          4,
          5,
          6
        ]
      }
    },
    "colorPrimary": "rgb(255,144,0)",
    "nameLegend": "Lightning",
    "namePublic": "Lightning",
    "nameShort": "Lightning",
    "roundto": 2,
    "units": "flashes / km^2 / 5 min"
  },
  "mixingHgt": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          1,
          3,
          5,
          7,
          10,
          15
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgb(150,150,150)",
          "rgb(0,190,255)",
          "rgb(255,255,0)",
          "rgb(255,0,0)",
          "rgb(255,0,255)",
          "rgb(100,0,100)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          1,
          2,
          3,
          4,
          5,
          7,
          10,
          15
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(200,200,200)",
    "nameLegend": "Mixing Height",
    "namePublic": "Mixing Height",
    "nameShort": "Mix Hgt",
    "roundto": 1,
    "units": "kft"
  },
  "mslp": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          970,
          1000,
          1030
        ],
        "colors": [
          "rgb(49,54,149)",
          "rgb(255,255,191)",
          "rgb(165,0,38)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          904,
          908,
          912,
          916,
          920,
          924,
          928,
          932,
          936,
          940,
          944,
          948,
          952,
          956,
          960,
          964,
          968,
          972,
          976,
          980,
          984,
          988,
          992,
          996,
          1000,
          1004,
          1008,
          1012,
          1016,
          1020,
          1024,
          1028,
          1032,
          1036,
          1040,
          1044
        ],
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(200,200,200)",
    "nameLegend": "MSLP",
    "namePublic": "Mean Sea Level Pressure",
    "nameShort": "MSLP",
    "roundto": 1,
    "roundtoReadout": 0,
    "units": "mb"
  },
  "orog": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          700,
          800,
          900,
          1000,
          1030
        ],
        "colors": [
          "rgb(165,0,38)",
          "rgb(255,255,191)",
          "rgb(49,54,149)",
          "rgb(49, 142, 149)",
          "rgb(97,97,97)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0,
          1000,
          2000,
          3000,
          4000
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(200,200,200)",
    "nameLegend": "Terrain Height",
    "namePublic": "Terrain Height",
    "nameShort": "Terrain hgt",
    "roundto": 0,
    "units": "m"
  },
  "sp": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          700,
          800,
          900,
          1000,
          1030
        ],
        "colors": [
          "rgb(97,97,97)",
          "rgb(49, 142, 149)",
          "rgb(49,54,149)",
          "rgb(255,255,191)",
          "rgb(165,0,38)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          904,
          908,
          912,
          916,
          920,
          924,
          928,
          932,
          936,
          940,
          944,
          948,
          952,
          956,
          960,
          964,
          968,
          972,
          976,
          980,
          984,
          988,
          992,
          996,
          1000,
          1004,
          1008,
          1012,
          1016,
          1020,
          1024,
          1028,
          1032,
          1036,
          1040,
          1044
        ],
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(200,200,200)",
    "nameLegend": "Surface Pressure",
    "namePublic": "Surface Pressure",
    "nameShort": "sfc pres",
    "roundto": 0,
    "units": "mb"
  },
  "psnow": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          1
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgb(0,0,255)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0.1,
          0.25,
          0.5,
          0.75,
          1
        ],
        "isLeftCap": false,
        "isRightCap": false,
        "ticks": "linear"
      },
      "spread": {
        "colorLevels": [
          0,
          0.25,
          0.5,
          1
        ]
      }
    },
    "colorPrimary": "rgba(0, 130, 255, 1)",
    "nameLegend": "Probabilistic Snowfall",
    "namePublic": "Probabilistic Snowfall",
    "nameShort": "pSnow",
    "roundto": 0,
    "units": "%"
  },
  "prain": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          1
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgb(0,255,0)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0.1,
          0.25,
          0.5,
          0.75,
          1
        ],
        "isLeftCap": false,
        "isRightCap": false,
        "ticks": "linear"
      },
      "spread": {
        "colorLevels": [
          0,
          0.25,
          0.5,
          1
        ]
      }
    },
    "colorPrimary": "rgb(35,187,118)",
    "nameLegend": "Probabilistic Rain",
    "namePublic": "Probabilistic Rain",
    "nameShort": "pRain",
    "roundto": 0,
    "units": "%"
  },
  "picep": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          1
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgb(255,0,255)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0.1,
          0.25,
          0.5,
          0.75,
          1
        ],
        "isLeftCap": false,
        "isRightCap": false,
        "ticks": "linear"
      },
      "spread": {
        "colorLevels": [
          0,
          0.25,
          0.5,
          1
        ]
      }
    },
    "colorPrimary": "rgb(102, 0, 204)",
    "nameLegend": "Probabilistic Sleet",
    "namePublic": "Probabilistic Sleet",
    "nameShort": "pSleet",
    "roundto": 0,
    "units": "%"
  },
  "pfrzr": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          1
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgb(255,50,0)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0.1,
          0.25,
          0.5,
          0.75,
          1
        ],
        "isLeftCap": false,
        "isRightCap": false,
        "ticks": "linear"
      },
      "spread": {
        "colorLevels": [
          0,
          0.25,
          0.5,
          1
        ]
      }
    },
    "colorPrimary": "rgb(255, 100, 255)",
    "nameLegend": "Probabilistic Freezing Rain",
    "namePublic": "Probabilistic Freezing Rain",
    "nameShort": "pFrzr",
    "roundto": 0,
    "units": "%"
  },
  "prmsl": {
    "defaults": "default",
    "roundto": 0,
    "units": "hPa"
  },
  "pw": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.5,
          1,
          1.5,
          2,
          2.5,
          3
        ],
        "colors": [
          "rgb(100, 54, 2)",
          "rgb(171, 93, 3)",
          "rgb(255, 255, 255)",
          "rgb(42, 137, 129)",
          "rgb(41, 100, 144)",
          "rgb(40, 66, 157)",
          "rgb(6, 19, 68)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0.25,
          0.5,
          0.75,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.25,
          2.5,
          2.75,
          3,
          3.25,
          3.5
        ],
        "isLeftCap": false,
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -2,
          -1,
          -0.75,
          -0.5,
          -0.25,
          -0.1,
          -0.05,
          0.05,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          2
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          0.1,
          0.25,
          0.5,
          0.75,
          1
        ]
      }
    },
    "colorPrimary": "rgb(0,200,0)",
    "nameLegend": "Precipitable Water",
    "namePublic": "Precipitable Water",
    "nameShort": "PW",
    "roundto": 2,
    "units": "in"
  },
  "p1": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.01,
          0.05,
          0.1,
          0.15,
          0.2,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          5
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgba(150,150,150,0)",
          "rgb(199,233,192)",
          "rgb(161,217,155)",
          "rgb(116,196,118)",
          "rgb(49,163,83)",
          "rgb(0,109,44)",
          "rgb(255,250,138)",
          "rgb(255,204,79)",
          "rgb(254,141,60)",
          "rgb(252,78,42)",
          "rgb(214,26,28)",
          "rgb(173,0,38)",
          "rgb(112,0,38)",
          "rgb(59,0,48)",
          "rgb(76,0,115)",
          "rgb(100,100,255)",
          "rgb(175,175,255)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          0.01,
          0.05,
          0.1,
          0.15,
          0.2,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          5
        ],
        "isLeftCap": false,
        "ticks": "byColorLevels"
      },
      "difference": {
        "colorLevels": [
          -0.5,
          -0.25,
          -0.2,
          -0.15,
          -0.1,
          -0.05,
          -0.01,
          0.01,
          0.05,
          0.1,
          0.15,
          0.2,
          0.25,
          0.5
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          0.05,
          0.1,
          0.25,
          0.5,
          1
        ]
      }
    },
    "colorPrimary": "rgb(50,255,50)",
    "nameLegend": "1 hr Precipitation",
    "namePublic": "1 hr Precipitation",
    "nameShort": "1hr Precip",
    "roundto": 2,
    "units": "in"
  },
  "p3": {
    "defaults": "p1",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          10,
          15
        ],
        "contourLevels": [
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          10,
          15
        ]
      },
      "difference": {
        "colorLevels": [
          -2,
          -1,
          -0.75,
          -0.5,
          -0.25,
          -0.1,
          -0.01,
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          2
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          0.05,
          0.1,
          0.25,
          0.5,
          1
        ]
      }
    },
    "nameLegend": "3 hr Precipitation",
    "namePublic": "3 hr Precipitation",
    "nameShort": "3hr Precip"
  },
  "p6": {
    "defaults": "p1",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          10,
          15
        ],
        "contourLevels": [
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          10,
          15
        ]
      },
      "difference": {
        "colorLevels": [
          -2,
          -1,
          -0.75,
          -0.5,
          -0.25,
          -0.1,
          -0.01,
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          2
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          0.05,
          0.1,
          0.25,
          0.5,
          1
        ]
      }
    },
    "nameLegend": "6 hr Precipitation",
    "namePublic": "6 hr Precipitation",
    "nameShort": "6hr Precip"
  },
  "p6qmd": {
    "defaults": "p6",
    "nameLegend": "QMD 6 hr Precipitation",
    "namePublic": "6 hr Precipitation",
    "nameShort": "QMD 6hr Precip"
  },
  "p6Det": {
    "defaults": "p6"
  },
  "p12": {
    "defaults": "p6",
    "nameLegend": "12 hr Precipitation",
    "namePublic": "12 hr Precipitation",
    "nameShort": "12hr Precip"
  },
  "p12Det": {
    "defaults": "p12"
  },
  "p24": {
    "defaults": "p6",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          3,
          4,
          5,
          6,
          8,
          10,
          15,
          20
        ],
        "contourLevels": [
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          3,
          4,
          5,
          6,
          8,
          10,
          15,
          20
        ]
      },
      "difference": {
        "colorLevels": [
          -2,
          -1,
          -0.75,
          -0.5,
          -0.25,
          -0.1,
          -0.01,
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          2
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          0.1,
          0.25,
          0.5,
          1,
          2
        ]
      }
    },
    "nameLegend": "24 hr Precipitation",
    "namePublic": "24 hr Precipitation",
    "nameShort": "24hr Precip"
  },
  "p24qmd": {
    "defaults": "p24",
    "nameLegend": "QMD 24 hr Precipitation",
    "namePublic": "24 hr Precipitation",
    "nameShort": "QMD 24hr Precip"
  },
  "ptotal": {
    "defaults": "p24",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.01,
          0.1,
          0.25,
          0.5,
          1,
          1.5,
          2,
          3,
          4,
          6,
          8,
          10,
          15,
          20,
          30,
          50
        ],
        "contourLevels": [
          0.01,
          0.1,
          0.25,
          0.5,
          1,
          1.5,
          2,
          3,
          4,
          6,
          8,
          10,
          15,
          20,
          30,
          50
        ]
      },
      "difference": {
        "colorLevels": [
          -8,
          -4,
          -2,
          -1,
          -0.5,
          -0.25,
          -0.1,
          0.1,
          0.25,
          0.5,
          1,
          2,
          4,
          8
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          0.25,
          0.5,
          1,
          2,
          3
        ]
      }
    },
    "nameLegend": "Accumulated Precipitation",
    "namePublic": "Accumulated Precipitation",
    "nameShort": "Acc Precip",
    "roundto": 2
  },
  "ptotalDet": {
    "defaults": "ptotal"
  },
  "p48": {
    "defaults": "ptotal",
    "nameLegend": "48 hr Precipitation",
    "namePublic": "48 hr Precipitation",
    "nameShort": "48hr Precip"
  },
  "p72": {
    "defaults": "ptotal",
    "nameLegend": "72 hr Precipitation",
    "namePublic": "72 hr Precipitation",
    "nameShort": "72hr Precip"
  },
  "PSSF": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0.5,
          2.5,
          3.5,
          4.5,
          5.5
        ],
        "colors": [
          "rgb(150,150,150,0)",
          "rgb(0,113,254)",
          "rgb(255,255,0)",
          "rgb(255,170,1)",
          "rgb(254,0,0)",
          "rgb(254,0,0)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          15,
          18,
          21
        ],
        "isLeftCap": false,
        "tickAngle": -90,
        "ticks": "byColorLevels",
        "tickValues": [
          "< 3 feet",
          "> 3 feet",
          "> 6 feet",
          "> 9 feet"
        ]
      }
    },
    "colorPrimary": "rgb(255,0,0)",
    "comment": "Values found here https://www.nhc.noaa.gov/gis/inundation/potential_storm_surge_flooding_downloads_guide.pdf",
    "nameLegend": "Storm Surge",
    "namePublic": "Storm Surge",
    "nameShort": "Storm Surge",
    "roundto": 1,
    "units": "class"
  },
  "refc": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          1,
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgba(0,255,255,0.2)",
          "rgba(0,233,231,0.5)",
          "rgb(5,158,244)",
          "rgb(11,0,244)",
          "rgb(16,253,3)",
          "rgb(8,197,2)",
          "rgb(0,142,1)",
          "rgb(253,248,4)",
          "rgb(230,188,14)",
          "rgb(253,138,2)",
          "rgb(253,2,3)",
          "rgb(212,1,6)",
          "rgb(188,1,0)",
          "rgb(248,3,254)",
          "rgb(230,230,230)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          1,
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70
        ],
        "isLeftCap": true,
        "ticks": "byColorLevels"
      },
      "difference": {
        "colorLevels": [
          -40,
          -30,
          -25,
          -20,
          -15,
          -10,
          -5,
          5,
          10,
          15,
          20,
          25,
          30,
          40
        ]
      }
    },
    "colorPrimary": "rgb(0,220,150)",
    "nameLegend": "Composite Reflectivity",
    "namePublic": "Composite Reflectivity",
    "nameShort": "Ref",
    "roundto": 0,
    "units": "dBZ"
  },
  "refcMax": {
    "defaults": "refc",
    "nameLegend": "Max 1 hr Reflectivity",
    "namePublic": "Max 1 hr Reflectivity",
    "nameShort": "Refc"
  },
  "retop": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          1,
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgba(0,255,255,0.2)",
          "rgba(0,233,231,0.5)",
          "rgb(5,158,244)",
          "rgb(11,0,244)",
          "rgb(16,253,3)",
          "rgb(8,197,2)",
          "rgb(0,142,1)",
          "rgb(253,248,4)",
          "rgb(230,188,14)",
          "rgb(253,138,2)",
          "rgb(253,2,3)",
          "rgb(212,1,6)",
          "rgb(188,1,0)",
          "rgb(248,3,254)",
          "rgb(230,230,230)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          1,
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70
        ],
        "isLeftCap": true,
        "ticks": "byColorLevels"
      },
      "difference": {
        "colorLevels": [
          -40,
          -30,
          -25,
          -20,
          -15,
          -10,
          -5,
          5,
          10,
          15,
          20,
          25,
          30,
          40
        ]
      }
    },
    "colorPrimary": "rgb(0,220,220)",
    "nameLegend": "18 dBZ Echo Top",
    "namePublic": "18 dBZ Echo Top",
    "nameShort": "Echo Top",
    "roundto": 0,
    "units": "kft"
  },
  "rh2": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          5,
          7.5,
          10,
          12.5,
          15,
          17.5,
          20,
          22.5,
          25,
          27.5,
          30,
          32.5,
          35,
          37.5,
          40,
          50,
          60,
          70,
          80,
          90
        ],
        "colors": [
          "rgb(171,115,122)",
          "rgb(205,123,126)",
          "rgb(227,128,131)",
          "rgb(240,146,139)",
          "rgb(243,172,154)",
          "rgb(244,172,125)",
          "rgb(247,192,148)",
          "rgb(249,210,173)",
          "rgb(252,229,204)",
          "rgb(179,179,179)",
          "rgb(198,198,198)",
          "rgb(218,218,218)",
          "rgb(234,234,234)",
          "rgb(246,246,246)",
          "rgb(255,255,255)",
          "rgb(236,244,250)",
          "rgb(223,235,246)",
          "rgb(202,225,238)",
          "rgb(174,210,232)",
          "rgb(152,195,223)",
          "rgb(133,177,214)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          0,
          5,
          10,
          15,
          20,
          25,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100
        ],
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -40,
          -30,
          -25,
          -20,
          -15,
          -10,
          -5,
          5,
          10,
          15,
          20,
          25,
          30,
          40
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          5,
          10,
          15,
          20,
          25
        ]
      }
    },
    "colorPrimary": "rgb(252,98,3)",
    "isZeroLowerBound": true,
    "nameLegend": "2m Relative Humidity",
    "namePublic": "Relative Humidity",
    "nameShort": "RH",
    "roundto": 0,
    "units": "%"
  },
  "r_isobaric": {
    "defaults": "rh2"
  },
  "rh2Max": {
    "defaults": "rh2",
    "colorPrimary": "rgb(255,193,7)",
    "nameLegend": "Relative Humidity",
    "namePublic": "Max Relative Humidity",
    "nameShort": "Max RH"
  },
  "rhll": {
    "defaults": "rh2",
    "colorPrimary": "rgb(255,193,7)",
    "nameLegend": "Lowest Layer Relative Humidity",
    "namePublic": "Lowest Layer Relative Humidity",
    "nameShort": "LL RH"
  },
  "rh2Min": {
    "defaults": "rh2",
    "colorPrimary": "rgb(240,240,0)",
    "nameLegend": "Relative Humidity",
    "namePublic": "Min Relative Humidity",
    "nameShort": "Min RH"
  },
  "r250": {
    "defaults": "rh2",
    "colorBars": {
      "spread": {
        "colorLevels": [
          0,
          10,
          20,
          30,
          40,
          50
        ]
      }
    },
    "nameLegend": "250 mb RH",
    "namePublic": "250 mb RH",
    "nameShort": "250mb RH"
  },
  "r500": {
    "defaults": "rh2",
    "colorBars": {
      "spread": {
        "colorLevels": [
          0,
          10,
          20,
          30,
          40,
          50
        ]
      }
    },
    "nameLegend": "500 mb RH",
    "namePublic": "500 mb RH",
    "nameShort": "500mb RH"
  },
  "r700": {
    "defaults": "rh2",
    "colorBars": {
      "spread": {
        "colorLevels": [
          0,
          10,
          20,
          30,
          40,
          50
        ]
      }
    },
    "nameLegend": "700 mb RH",
    "namePublic": "700 mb RH",
    "nameShort": "700mb RH"
  },
  "r850": {
    "defaults": "rh2",
    "colorBars": {
      "spread": {
        "colorLevels": [
          0,
          10,
          20,
          30,
          40,
          50
        ]
      }
    },
    "nameLegend": "850 mb RH",
    "namePublic": "850 mb RH",
    "nameShort": "850mb RH"
  },
  "r925": {
    "defaults": "rh2",
    "colorBars": {
      "spread": {
        "colorLevels": [
          0,
          10,
          20,
          30,
          40,
          50
        ]
      }
    },
    "nameLegend": "925 mb RH",
    "namePublic": "925 mb RH",
    "nameShort": "925mb RH"
  },
  "smokesfc": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          1,
          25,
          50,
          100,
          150,
          200,
          250
        ],
        "colors": [
          "rgba(0,0,0,0)",
          "rgba(0,0,0,0)",
          "rgb(201, 201, 201)",
          "rgb(236, 186, 79)",
          "rgb(238, 159, 67)",
          "rgb(200, 93, 30)",
          "rgb(147, 63, 17)",
          "rgb(93, 33, 4)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          1,
          25,
          50,
          100,
          150,
          200,
          250
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(250,0,0)",
    "nameLegend": "Near Surface Smoke",
    "namePublic": "Near Surface Smoke",
    "nameShort": "Smoke",
    "roundto": 1,
    "roundtoReadout": 0,
    "units": "µg/m^3"
  },
  "smoke": {
    "defaults": "smokesfc",
    "nameLegend": "Smoke",
    "namePublic": "Smoke",
    "nameShort": "Smoke"
  },
  "smokeVI": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          1,
          25,
          50,
          100,
          150,
          250
        ],
        "colors": [
          "rgba(0,0,0,0)",
          "rgba(0,0,0,0)",
          "rgb(201, 201, 201)",
          "rgb(236, 186, 79)",
          "rgb(238, 159, 67)",
          "rgb(200, 93, 30)",
          "rgb(93, 33, 4)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          1,
          25,
          50,
          100,
          150,
          200,
          250
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(255,0,200)",
    "nameLegend": "Vertically Integrated Smoke",
    "namePublic": "Vertically Integrated Smoke",
    "nameShort": "Smoke",
    "roundto": 1,
    "roundtoReadout": 0,
    "units": "mg/m^2"
  },
  "swe1": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.1,
          0.2,
          0.3,
          0.5,
          0.75,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.5,
          3
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgba(150,150,150,0)",
          "rgb(189,215,231)",
          "rgb(107,174,214)",
          "rgb(49,130,189)",
          "rgb(8,81,156)",
          "rgb(23,60,148)",
          "rgb(255,255,150)",
          "rgb(255,196,0)",
          "rgb(255,135,0)",
          "rgb(219,20,0)",
          "rgb(158,0,0)",
          "rgb(105,0,0)",
          "rgb(50,0,0)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          0.1,
          0.2,
          0.3,
          0.5,
          0.75,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.5,
          3
        ],
        "isLeftCap": false,
        "ticks": "byColorLevels"
      },
      "spread": {
        "colorLevels": [
          0,
          0.25,
          0.5,
          1,
          1.5,
          2
        ]
      }
    },
    "colorPrimary": "rgb(0,150,235)",
    "nameLegend": "1 Hour Snowfall (10:1)",
    "namePublic": "1 Hour Snowfall (10:1)",
    "nameShort": "Snow",
    "roundto": 1,
    "roundtoReadout": 1,
    "units": "in10"
  },
  "snow1": {
    "defaults": "swe1",
    "nameLegend": "1 Hour Snowfall",
    "namePublic": "1 Hour Snowfall",
    "units": "in"
  },
  "swe3": {
    "defaults": "swe1",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.1,
          0.5,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10
        ],
        "contourLevels": [
          0.1,
          0.5,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10
        ]
      }
    },
    "colorPrimary": "rgb(0,150,235)",
    "nameLegend": "3 Hour Snowfall (10:1)",
    "namePublic": "3 Hour Snowfall (10:1)",
    "roundto": 1,
    "roundtoReadout": 0
  },
  "swe6": {
    "defaults": "swe1",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.1,
          0.5,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10
        ],
        "contourLevels": [
          0.1,
          0.5,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10
        ]
      }
    },
    "colorPrimary": "rgb(0,150,235)",
    "nameLegend": "6 Hour Snowfall (10:1)",
    "namePublic": "6 Hour Snowfall (10:1)",
    "roundto": 1,
    "roundtoReadout": 0
  },
  "snow6": {
    "defaults": "swe6",
    "nameLegend": "6 hr Snowfall",
    "namePublic": "6 hr Snowfall",
    "units": "in"
  },
  "swe24": {
    "defaults": "swe6",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.1,
          1,
          2,
          3,
          4,
          6,
          8,
          12,
          18,
          24,
          30,
          36
        ],
        "contourLevels": [
          0.1,
          1,
          2,
          3,
          4,
          6,
          8,
          12,
          18,
          24,
          30,
          36
        ]
      },
      "spread": {
        "colorLevels": [
          1,
          2,
          3,
          4,
          5,
          6
        ]
      }
    },
    "nameLegend": "24 Hour Snowfall (10:1)",
    "namePublic": "24 Hour Snowfall (10:1)",
    "nameShort": "Snow"
  },
  "snow24": {
    "defaults": "swe24",
    "nameLegend": "24 Hour Snowfall",
    "namePublic": "24 Hour Snowfall",
    "units": "in"
  },
  "snow48": {
    "defaults": "swe24",
    "nameLegend": "48 Hour Snowfall",
    "namePublic": "48 Hour Snowfall",
    "units": "in"
  },
  "snow72": {
    "defaults": "swe24",
    "nameLegend": "72 Hour Snowfall",
    "namePublic": "72 Hour Snowfall",
    "units": "in"
  },
  "swetotal": {
    "defaults": "swe24",
    "colorPrimary": "rgb(0,0,200)",
    "nameLegend": "Accumulated Snowfall (10:1)",
    "namePublic": "Accumulated Snowfall (10:1)",
    "nameShort": "Snow"
  },
  "snowtotal": {
    "defaults": "swetotal",
    "nameLegend": "Accumulated Snowfall",
    "namePublic": "Accumulated Snowfall",
    "units": "in"
  },
  "snowlvl": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          1,
          2,
          3,
          4,
          6,
          8,
          10,
          15
        ],
        "colors": [
          "rgb(243,203,254)",
          "rgb(255,0,0)",
          "rgb(255,150,0)",
          "rgb(255,255,0)",
          "rgb(100,200,120)",
          "rgb(70,118,196)",
          "rgb(91,205,240)",
          "rgb(205,205,240)",
          "rgb(255,255,255)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0,
          1,
          2,
          3,
          4,
          6,
          8,
          10,
          15
        ],
        "isLeftCap": false,
        "ticks": "byColorLevels"
      },
      "spread": {
        "colorLevels": [
          0,
          0.5,
          1,
          2,
          3,
          4
        ]
      }
    },
    "colorPrimary": "rgb(200,200,255)",
    "nameLegend": "Snow Level",
    "namePublic": "Snow Level",
    "nameShort": "Snow Level",
    "roundto": 1,
    "units": "kft"
  },
  "snowlr": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          5,
          10,
          15,
          20,
          25,
          30
        ],
        "colors": [
          "rgb(0,0,50)",
          "rgb(50,106,154)",
          "rgb(177,246,249)",
          "rgb(229,225,227)",
          "rgb(238,153,204)",
          "rgb(204,110,139)",
          "rgb(155,79,81)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          1,
          5,
          10,
          15,
          20,
          25,
          30
        ],
        "isLeftCap": false,
        "ticks": "byColorLevels"
      }
    },
    "colorPrimary": "rgb(200,150,255)",
    "nameLegend": "Snow Liquid Ratio",
    "namePublic": "Snow Liquid Ratio",
    "nameShort": "SLR",
    "roundto": 0,
    "units": ""
  },
  "solarRad": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          300,
          600,
          900,
          1200
        ],
        "colors": [
          "rgba(0,0,0,0)",
          "rgb(255,255,0)",
          "rgb(255,155,0)",
          "rgb(255,0,0)",
          "rgb(100,0,0)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          100,
          300,
          500,
          1000,
          1500
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(200,0,0)",
    "nameLegend": "Solar Radiation",
    "namePublic": "Solar Radiation",
    "nameShort": "Solar Rad",
    "roundto": 0,
    "units": "W/m^2"
  },
  "sigWave": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          5,
          10,
          15,
          20,
          30,
          40,
          50
        ],
        "colors": [
          "rgba(0,0,0,0)",
          "rgb(0,0,200)",
          "rgb(220,220,0)",
          "rgb(255,131,0)",
          "rgb(255,0,0)",
          "rgb(100,0,100)",
          "rgb(200,0,200)",
          "rgb(255,255,255)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgba(0,0,255,1)",
    "nameLegend": "Significant Wave Height",
    "namePublic": "Significant Wave Height",
    "nameShort": "Wave Hgt",
    "roundto": 0,
    "units": "ft"
  },
  "waveHgt": {
    "defaults": "sigWave",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          3,
          6,
          10,
          15,
          20,
          25,
          30
        ],
        "contourLevels": [
          3,
          6,
          10,
          15,
          20,
          25,
          30
        ]
      }
    },
    "nameLegend": "Wave Height",
    "namePublic": "Wave Height"
  },
  "SOVI_SCORE": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          50,
          100
        ],
        "colors": [
          "rgb(255,255,229)",
          "rgb(161,219,226)",
          "rgb(100,125,212)"
        ],
        "colorType": "scaleLinear",
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "nameLegend": "Social Vulnerability Index",
    "namePublic": "Social Vulnerability Index",
    "nameShort": "SVI",
    "roundto": 0,
    "units": ""
  },
  "POPDENS": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          1500,
          3000
        ],
        "colors": [
          "rgb(255,255,229)",
          "rgb(161,219,226)",
          "rgb(100,125,212)"
        ],
        "colorType": "scaleLinear",
        "ticks": "linear"
      }
    },
    "nameLegend": "Population",
    "namePublic": "Population",
    "nameShort": "Pop. density",
    "roundto": 0,
    "units": ""
  },
  "EP_MOBILE": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          25,
          50
        ],
        "colors": [
          "rgb(255,255,229)",
          "rgb(161,219,226)",
          "rgb(100,125,212)"
        ],
        "colorType": "scaleLinear",
        "ticks": "linear"
      }
    },
    "nameLegend": "Mobile Homes",
    "namePublic": "Mobile Homes",
    "nameShort": "Mobile homes",
    "roundto": 0,
    "units": ""
  },
  "EP_LIMENG": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          10,
          20
        ],
        "colors": [
          "rgb(255,255,229)",
          "rgb(161,219,226)",
          "rgb(100,125,212)"
        ],
        "colorType": "scaleLinear",
        "ticks": "linear"
      }
    },
    "nameLegend": "Limited English Speakers",
    "namePublic": "Limited English Speakers",
    "nameShort": "Limited english",
    "roundto": 0,
    "units": ""
  },
  "EP_NOVEH": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          15,
          30
        ],
        "colors": [
          "rgb(255,255,229)",
          "rgb(161,219,226)",
          "rgb(100,125,212)"
        ],
        "colorType": "scaleLinear",
        "ticks": "linear"
      }
    },
    "nameLegend": "Households with no vehicle available",
    "namePublic": "Households with no vehicle available",
    "nameShort": "No vehicle",
    "roundto": 0,
    "units": ""
  },
  "EP_NOINT": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          30,
          60
        ],
        "colors": [
          "rgb(255,255,229)",
          "rgb(161,219,226)",
          "rgb(100,125,212)"
        ],
        "colorType": "scaleLinear",
        "ticks": "linear"
      }
    },
    "nameLegend": "Households without a broadband internet subscription",
    "namePublic": "Households w/o broadband internet",
    "nameShort": "No internet",
    "roundto": 0,
    "units": ""
  },
  "d2": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          10,
          20,
          30,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80
        ],
        "colors": [
          "rgb(59,34,4)",
          "rgb(84,48,5)",
          "rgb(140,82,10)",
          "rgb(191,129,45)",
          "rgb(204,168,84)",
          "rgb(223,194,125)",
          "rgb(230,217,181)",
          "rgb(211,235,231)",
          "rgb(169,219,211)",
          "rgb(114,184,173)",
          "rgb(49,140,133)",
          "rgb(1,102,95)",
          "rgb(0,60,48)",
          "rgb(0,41,33)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          0,
          10,
          20,
          30,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80
        ],
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -14,
          -12,
          -10,
          -8,
          -6,
          -4,
          -2,
          2,
          4,
          6,
          8,
          10,
          12,
          14
        ]
      }
    },
    "colorPrimary": "var(--graphcolorlight)",
    "isZeroLowerBound": true,
    "nameLegend": "2m Dew Point",
    "namePublic": "Dew Point",
    "nameShort": "2m Dpt",
    "roundto": 1,
    "roundtoReadout": 0,
    "units": "F"
  },
  "dpt_isobaric": {
    "defaults": "d2"
  },
  "t2": {
    "defaults": "d2",
    "colorBars": {
      "default": {
        "colorLevels": [
          -60,
          -55,
          -50,
          -45,
          -40,
          -35,
          -30,
          -25,
          -20,
          -15,
          -10,
          -5,
          0,
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100,
          105,
          110,
          115,
          120
        ],
        "colors": [
          "rgb(145,0,63)",
          "rgb(206,18,86)",
          "rgb(231,41,138)",
          "rgb(223,101,176)",
          "rgb(255,115,223)",
          "rgb(255,190,232)",
          "rgb(250,250,250)",
          "rgb(218,218,235)",
          "rgb(188,189,220)",
          "rgb(158,154,200)",
          "rgb(117,107,177)",
          "rgb(84,39,143)",
          "rgb(13,0,125)",
          "rgb(13,61,156)",
          "rgb(0,102,194)",
          "rgb(41,158,255)",
          "rgb(74,199,255)",
          "rgb(115,215,255)",
          "rgb(173,255,255)",
          "rgb(48,207,194)",
          "rgb(0,153,150)",
          "rgb(18,87,87)",
          "rgb(6,109,44)",
          "rgb(49,163,84)",
          "rgb(116,196,118)",
          "rgb(161,217,155)",
          "rgb(211,255,190)",
          "rgb(255,255,179)",
          "rgb(255,237,160)",
          "rgb(254,209,118)",
          "rgb(254,174,42)",
          "rgb(253,141,60)",
          "rgb(252,78,42)",
          "rgb(227,26,28)",
          "rgb(177,0,38)",
          "rgb(128,0,38)",
          "rgb(89,0,66)",
          "rgb(40,0,40)"
        ],
        "contourLevels": [
          -60,
          -55,
          -50,
          -45,
          -40,
          -35,
          -30,
          -25,
          -20,
          -15,
          -10,
          -5,
          0,
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100,
          105,
          110,
          115,
          120
        ]
      }
    },
    "colorPrimary": "rgb(255,0,0)",
    "nameLegend": "2m Temperature",
    "namePublic": "Temperature",
    "nameShort": "2m Temp"
  },
  "t500": {
    "defaults": "t2",
    "colorBars": {
      "default": {
        "colorLevels": [
          -66,
          -63,
          -60,
          -57,
          -54,
          -51,
          -48,
          -45,
          -42,
          -39,
          -36,
          -33,
          -30,
          -27,
          -24,
          -21,
          -18,
          -15,
          -12,
          -9,
          -6,
          -3,
          0,
          3,
          6,
          9,
          12,
          15,
          18,
          21,
          24,
          27,
          30,
          33,
          36,
          39,
          42
        ],
        "contourLevels": [
          -66,
          -63,
          -60,
          -57,
          -54,
          -51,
          -48,
          -45,
          -42,
          -39,
          -36,
          -33,
          -30,
          -27,
          -24,
          -21,
          -18,
          -15,
          -12,
          -9,
          -6,
          -3,
          0,
          3,
          6,
          9,
          12,
          15,
          18,
          21,
          24,
          27,
          30,
          33,
          36,
          39,
          42
        ]
      }
    },
    "nameLegend": "500 mb Temp",
    "namePublic": "500 mb Temperature",
    "nameShort": "500 mb Temp",
    "units": "C"
  },
  "t700": {
    "defaults": "t2",
    "colorBars": {
      "default": {
        "colorLevels": [
          -66,
          -63,
          -60,
          -57,
          -54,
          -51,
          -48,
          -45,
          -42,
          -39,
          -36,
          -33,
          -30,
          -27,
          -24,
          -21,
          -18,
          -15,
          -12,
          -9,
          -6,
          -3,
          0,
          3,
          6,
          9,
          12,
          15,
          18,
          21,
          24,
          27,
          30,
          33,
          36,
          39,
          42
        ],
        "contourLevels": [
          -66,
          -63,
          -60,
          -57,
          -54,
          -51,
          -48,
          -45,
          -42,
          -39,
          -36,
          -33,
          -30,
          -27,
          -24,
          -21,
          -18,
          -15,
          -12,
          -9,
          -6,
          -3,
          0,
          3,
          6,
          9,
          12,
          15,
          18,
          21,
          24,
          27,
          30,
          33,
          36,
          39,
          42
        ]
      },
      "difference": {
        "colorLevels": [
          -14,
          -12,
          -10,
          -8,
          -6,
          -4,
          -2,
          2,
          4,
          6,
          8,
          10,
          12,
          14
        ]
      }
    },
    "nameLegend": "700 mb Temp",
    "namePublic": "700 mb Temperature",
    "nameShort": "700 mb Temp",
    "units": "C"
  },
  "t850": {
    "defaults": "t2",
    "colorBars": {
      "default": {
        "colorLevels": [
          -66,
          -63,
          -60,
          -57,
          -54,
          -51,
          -48,
          -45,
          -42,
          -39,
          -36,
          -33,
          -30,
          -27,
          -24,
          -21,
          -18,
          -15,
          -12,
          -9,
          -6,
          -3,
          0,
          3,
          6,
          9,
          12,
          15,
          18,
          21,
          24,
          27,
          30,
          33,
          36,
          39,
          42
        ],
        "contourLevels": [
          -66,
          -63,
          -60,
          -57,
          -54,
          -51,
          -48,
          -45,
          -42,
          -39,
          -36,
          -33,
          -30,
          -27,
          -24,
          -21,
          -18,
          -15,
          -12,
          -9,
          -6,
          -3,
          0,
          3,
          6,
          9,
          12,
          15,
          18,
          21,
          24,
          27,
          30,
          33,
          36,
          39,
          42
        ]
      },
      "difference": {
        "colorLevels": [
          -14,
          -12,
          -10,
          -8,
          -6,
          -4,
          -2,
          2,
          4,
          6,
          8,
          10,
          12,
          14
        ]
      }
    },
    "nameLegend": "850 mb Temp",
    "namePublic": "850 mb Temperature",
    "nameShort": "850 mb Temp",
    "units": "C"
  },
  "t925": {
    "defaults": "t2",
    "colorBars": {
      "default": {
        "colorLevels": [
          -66,
          -63,
          -60,
          -57,
          -54,
          -51,
          -48,
          -45,
          -42,
          -39,
          -36,
          -33,
          -30,
          -27,
          -24,
          -21,
          -18,
          -15,
          -12,
          -9,
          -6,
          -3,
          0,
          3,
          6,
          9,
          12,
          15,
          18,
          21,
          24,
          27,
          30,
          33,
          36,
          39,
          42
        ],
        "contourLevels": [
          -66,
          -63,
          -60,
          -57,
          -54,
          -51,
          -48,
          -45,
          -42,
          -39,
          -36,
          -33,
          -30,
          -27,
          -24,
          -21,
          -18,
          -15,
          -12,
          -9,
          -6,
          -3,
          0,
          3,
          6,
          9,
          12,
          15,
          18,
          21,
          24,
          27,
          30,
          33,
          36,
          39,
          42
        ]
      },
      "difference": {
        "colorLevels": [
          -14,
          -12,
          -10,
          -8,
          -6,
          -4,
          -2,
          2,
          4,
          6,
          8,
          10,
          12,
          14
        ]
      }
    },
    "nameLegend": "925 mb Temp",
    "namePublic": "925 mb Temperature",
    "nameShort": "925 mb Temp",
    "units": "C"
  },
  "t_isobaric": {
    "defaults": "t2"
  },
  "mx2t12": {
    "defaults": "t2",
    "nameLegend": "Max Temperature",
    "namePublic": "Max Temperature",
    "nameShort": "Max Temp"
  },
  "mx2t18": {
    "defaults": "mx2t12"
  },
  "mxmn2t18": {
    "defaults": "mx2t12"
  },
  "mx2t6": {
    "defaults": "mx2t12"
  },
  "mn2t12": {
    "defaults": "mx2t12",
    "colorPrimary": "rgb(100,100,255)",
    "nameLegend": "Min Temperature",
    "namePublic": "Min Temperature",
    "nameShort": "Min Temp"
  },
  "mn2t18": {
    "defaults": "mn2t12"
  },
  "mn2t6": {
    "defaults": "mn2t12"
  },
  "tw2": {
    "defaults": "t2",
    "colorPrimary": "rgb(200,200,200)",
    "nameLegend": "2m Wet Bulb",
    "namePublic": "Wet Bulb Temperature",
    "nameShort": "2m Tw Temp"
  },
  "twgt2": {
    "defaults": "t2",
    "colorPrimary": "rgb(200,200,200)",
    "nameLegend": "2m Wet Bulb Globe Temperature",
    "namePublic": "Wet Bulb Globe Temperature",
    "nameShort": "2m Globe Temp"
  },
  "ta2": {
    "defaults": "t2",
    "nameLegend": "2m Apparent Temperature",
    "namePublic": "Apparent Temperature",
    "nameShort": "2m Ta Temp"
  },
  "tadv700": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          -3.5,
          -3,
          -2.5,
          -2,
          -1.5,
          -1,
          -0.5,
          0.5,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5
        ],
        "colors": [
          "rgb(0,0,70)",
          "rgb(36,56,119)",
          "rgb(68,106,161)",
          "rgb(100,152,195)",
          "rgb(132,185,216)",
          "rgb(164,207,228)",
          "rgba(194,227,239,200)",
          "rgba(255,255,255,0)",
          "rgba(254,195,118,200)",
          "rgb(252,163,95)",
          "rgb(247,128,76)",
          "rgb(234,93,59)",
          "rgb(199,61,41)",
          "rgb(148,29,24)",
          "rgb(84,0,0)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          -7,
          -6,
          -5,
          -4,
          -3,
          -2,
          -1,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ]
      },
      "difference": {
        "colorLevels": [
          -3.5,
          -3,
          -2.5,
          -2,
          -1.5,
          -1,
          -0.5,
          0.5,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          0.5,
          1,
          1.5,
          2,
          2.5
        ]
      }
    },
    "colorPrimary": "rgb(255,100,1000)",
    "isZeroLowerBound": true,
    "nameLegend": "700mb T-Advection",
    "namePublic": "700mb T-Advection",
    "nameShort": "700mb T-Adv",
    "roundto": 1,
    "units": "K/hr"
  },
  "tadv850": {
    "defaults": "tadv700",
    "nameLegend": "850mb T-Advection",
    "namePublic": "850mb T-Advection",
    "nameShort": "850mb T-Adv"
  },
  "t_cloudTop": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          -90,
          -80,
          -70,
          -60,
          -50,
          -40,
          -30,
          -20,
          0
        ],
        "colors": [
          "rgb(179,15,145)",
          "rgb(225,226,228)",
          "rgb(0,0,0)",
          "rgb(255,0,0)",
          "rgb(255,246,0)",
          "rgb(0,253,0)",
          "rgb(0,24,133)",
          "rgb(0,254,255)",
          "rgb(10,10,10)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          -90,
          -80,
          -70,
          -60,
          -50,
          -40,
          -30,
          -20
        ],
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -35,
          -30,
          -25,
          -20,
          -15,
          -10,
          -5,
          5,
          10,
          15,
          20,
          25,
          30,
          35
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          5,
          10,
          15,
          20,
          25
        ]
      }
    },
    "colorPrimary": "rgb(255,0,255)",
    "isZeroLowerBound": true,
    "nameLegend": "Cloud Top Temperature",
    "namePublic": "Cloud Top Temperature",
    "nameShort": "CloudTop Temp",
    "roundto": 0,
    "units": "C"
  },
  "probthunder": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          25,
          50,
          75,
          100
        ],
        "colors": [
          "rgba(0,0,0,0)",
          "rgb(255,255,0)",
          "rgb(255,0,0)",
          "rgb(255,0,255)",
          "rgb(255,255,255)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          30,
          60,
          90,
          100
        ],
        "isLeftCap": false,
        "isRightCap": false,
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -75,
          -50,
          -40,
          -30,
          -20,
          -10,
          -5,
          5,
          10,
          20,
          30,
          40,
          50,
          75
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          15,
          30,
          45,
          60,
          75
        ]
      }
    },
    "colorPrimary": "rgb(255,255,0)",
    "isZeroLowerBound": true,
    "nameLegend": "Prob Thunder",
    "namePublic": "Probability of Thunder",
    "nameShort": "Thunder",
    "roundto": 0,
    "units": "%"
  },
  "turb": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          1,
          2,
          3,
          4
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgba(150,150,150,0)",
          "rgb(64,202,52)",
          "rgb(246,247,41)",
          "rgb(244,172,42)",
          "rgb(220,79,44)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          1,
          2,
          3,
          4
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(255,255,50)",
    "isZeroLowerBound": true,
    "nameLegend": "Turbulence",
    "namePublic": "Turbulence",
    "nameShort": "Turb",
    "roundto": 0,
    "units": ""
  },
  "tcc": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          50,
          75,
          100
        ],
        "colors": [
          "rgb(68,114,196)",
          "rgb(166,166,166)",
          "rgb(127,127,127)",
          "rgb(50,50,50)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          20,
          40,
          60,
          80,
          100
        ],
        "isLeftCap": false,
        "isRightCap": false,
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -75,
          -50,
          -40,
          -30,
          -20,
          -10,
          -5,
          5,
          10,
          20,
          30,
          40,
          50,
          75
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          15,
          30,
          45,
          60,
          75
        ]
      }
    },
    "colorPrimary": "var(--fontcolor)",
    "nameLegend": "Total Cloud Cover",
    "namePublic": "Cloud Cover",
    "nameShort": "Cloud",
    "roundto": 0,
    "units": "%"
  },
  "lcc": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          100
        ],
        "colors": [
          "rgba(40,68,165,0)",
          "rgb(40,68,255)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          20,
          40,
          60,
          80,
          100
        ],
        "isLeftCap": false,
        "isRightCap": false,
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -75,
          -50,
          -40,
          -30,
          -20,
          -10,
          -5,
          5,
          10,
          20,
          30,
          40,
          50,
          75
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          15,
          30,
          45,
          60,
          75
        ]
      }
    },
    "colorPrimary": "rgb(40,68,165)",
    "nameLegend": "Low Cloud Cover (<5 kft MSL)",
    "namePublic": "Low Cloud Cover (<5 kft MSL)",
    "nameShort": "Low Cloud",
    "roundto": 0,
    "units": "%"
  },
  "mcc": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          100
        ],
        "colors": [
          "rgba(66,128,28,0)",
          "rgb(66,255,28)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          20,
          40,
          60,
          80,
          100
        ],
        "isLeftCap": false,
        "isRightCap": false,
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -75,
          -50,
          -40,
          -30,
          -20,
          -10,
          -5,
          5,
          10,
          20,
          30,
          40,
          50,
          75
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          15,
          30,
          45,
          60,
          75
        ]
      }
    },
    "colorPrimary": "rgb(66,128,28)",
    "nameLegend": "Mid Cloud Cover (5-25 kft MSL)",
    "namePublic": "Mid Cloud Cover (5-25 kft MSL)",
    "nameShort": "Mid Cloud",
    "roundto": 0,
    "units": "%"
  },
  "hcc": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          100
        ],
        "colors": [
          "rgba(154,43,85,0)",
          "rgb(255,43,85)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          20,
          40,
          60,
          80,
          100
        ],
        "isLeftCap": false,
        "isRightCap": false,
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -75,
          -50,
          -40,
          -30,
          -20,
          -10,
          -5,
          5,
          10,
          20,
          30,
          40,
          50,
          75
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          15,
          30,
          45,
          60,
          75
        ]
      }
    },
    "colorPrimary": "rgb(154,43,85)",
    "nameLegend": "High Cloud Cover (>25 kft MSL)",
    "namePublic": "High Cloud Cover (>25 kft MSL)",
    "nameShort": "High Cloud",
    "roundto": 0,
    "units": "%"
  },
  "mxUpHel2to5": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          90,
          105,
          120,
          135,
          150,
          180,
          210,
          240,
          270,
          300,
          340,
          380,
          420,
          460,
          500
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgb(204,204,204)",
          "rgb(178,178,178)",
          "rgb(153,153,153)",
          "rgb(127,127,127)",
          "rgb(102,102,102)",
          "rgb(127,178,255)",
          "rgb(102,146,235)",
          "rgb(76,114,216)",
          "rgb(50,82,197)",
          "rgb(25,51,178)",
          "rgb(127,255,127)",
          "rgb(98,216,98)",
          "rgb(70,178,70)",
          "rgb(41,140,41)",
          "rgb(12,102,12)",
          "rgb(255,255,102)",
          "rgb(232,197,76)",
          "rgb(210,140,51)",
          "rgb(188,82,25)",
          "rgb(165,25,0)",
          "rgb(255,153,255)",
          "rgb(224,123,224)",
          "rgb(193,94,193)",
          "rgb(132,36,132)",
          "rgb(102,7,102)",
          "rgb(102,7,102)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          25,
          50,
          75,
          100,
          150,
          300,
          500
        ],
        "isLeftCap": false,
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -175,
          -150,
          -125,
          -100,
          -75,
          -50,
          -25,
          25,
          50,
          75,
          100,
          125,
          150,
          175
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          25,
          50,
          100,
          150,
          200
        ]
      }
    },
    "colorPrimary": "rgb(255,0,255)",
    "nameLegend": "2-5km Max Updraft Helicity",
    "namePublic": "2-5km Max Updraft Helicity",
    "nameShort": "2-5km Max Up. Hel.",
    "roundto": 0,
    "units": "m^2/s^2"
  },
  "mxUpHel0to3": {
    "defaults": "mxUpHel2to5",
    "nameLegend": "0-3km Max Updraft Helicity",
    "namePublic": "0-3km Max Updraft Helicity",
    "nameShort": "0-3km Max Up. Hel."
  },
  "mnUpHel2to5": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          -250,
          -200,
          -150,
          -125,
          -100,
          -75,
          -50,
          -25,
          -15
        ],
        "colors": [
          "rgb(229,229,229)",
          "rgb(197,197,197)",
          "rgb(165,165,165)",
          "rgb(133,133,133)",
          "rgb(102,102,102)",
          "rgb(25,51,178)",
          "rgb(51,82,197)",
          "rgb(76,114,216)",
          "rgb(127,178,255)",
          "rgba(150,150,150,0)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          -250,
          -200,
          -150,
          -125,
          -100,
          -75,
          -50,
          -25
        ],
        "ticks": "byColorLevels"
      },
      "difference": {
        "colorLevels": [
          -175,
          -150,
          -125,
          -100,
          -75,
          -50,
          -25,
          25,
          50,
          75,
          100,
          125,
          150,
          175
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          25,
          50,
          100,
          150,
          200
        ]
      }
    },
    "colorPrimary": "rgb(255,0,255)",
    "nameLegend": "2-5km Min Updraft Helicity",
    "namePublic": "2-5km Min Updraft Helicity",
    "nameShort": "2-5km Min Up. Hel.",
    "roundto": 0,
    "units": "m^2/s^2"
  },
  "mnUpHel0to3": {
    "defaults": "mnUpHel2to5",
    "nameLegend": "0-3km Min Updraft Helicity",
    "namePublic": "0-3km Min Updraft Helicity",
    "nameShort": "0-3km Min Up. Hel."
  },
  "u10": {
    "defaults": "default",
    "roundto": 0,
    "units": "mph"
  },
  "u_isobaric": {
    "defaults": "u10"
  },
  "v10": {
    "defaults": "default",
    "roundto": 0,
    "units": "mph"
  },
  "v_isobaric": {
    "defaults": "v10"
  },
  "w_isobaric": {
    "defaults": "v10"
  },
  "vis": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.1,
          0.25,
          0.5,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10
        ],
        "colors": [
          "rgb(0, 0, 0)",
          "rgb(0, 0, 0)",
          "rgb(65, 10, 30)",
          "rgb(88, 24, 69)",
          "rgb(150, 30, 150)",
          "rgb(225, 0, 0)",
          "rgb(255, 100, 100)",
          "rgb(255, 255, 0)",
          "rgb(255, 255, 150)",
          "rgb(100,100,100)",
          "rgba(140,140,140,0.8)",
          "rgba(180,180,180,0.6)",
          "rgba(210,210,210,0.4)",
          "rgba(255,255,255,0.2)",
          "rgba(255,255,255,0)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          0,
          0.1,
          0.25,
          0.5,
          1,
          2,
          3,
          5,
          10
        ],
        "isLeftCap": false,
        "ticks": "byColorLevels"
      },
      "difference": {
        "colorLevels": [
          -6,
          -5,
          -4,
          -3,
          -2,
          -1,
          -0.5,
          0.5,
          1,
          2,
          3,
          4,
          5,
          6
        ]
      }
    },
    "colorPrimary": "rgb(200,200,200)",
    "comment": "Capping at 15 for the HREF",
    "isZeroLowerBound": true,
    "nameLegend": "Visibility",
    "namePublic": "Visibility",
    "nameShort": "Vis",
    "roundto": 1,
    "units": "mi"
  },
  "vil": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          0.01,
          0.1,
          0.5,
          1,
          2,
          2.5
        ],
        "colors": [
          "rgba(0,100,255,0)",
          "rgb(0,0,200)",
          "rgb(0,0,100)",
          "rgb(0,255,0)",
          "rgb(255,255,0)",
          "rgb(255,0,0)",
          "rgb(150,0,150)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0,
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.25,
          1.5,
          2,
          2.5
        ],
        "isLeftCap": false,
        "ticks": "byColorLevels"
      }
    },
    "colorPrimary": "rgb(200,200,0)",
    "nameLegend": "Vertically Integrated Liquid",
    "namePublic": "Vertically Integrated Liquid",
    "nameShort": "VIL",
    "roundto": 2,
    "units": "in"
  },
  "vrate": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          2,
          5,
          10,
          20,
          30,
          50
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgb(150,150,150)",
          "rgb(0,190,255)",
          "rgb(255,255,0)",
          "rgb(255,0,0)",
          "rgb(255,0,255)",
          "rgb(100,0,100)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          1,
          3,
          5,
          7,
          10,
          15
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(200,200,255)",
    "nameLegend": "Ventiliation Rate",
    "namePublic": "Ventiliation Rate",
    "nameShort": "Vent Rate",
    "roundto": 1,
    "units": "1000*m^2/s"
  },
  "wfirepot": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          25,
          50,
          75,
          100
        ],
        "colors": [
          "rgba(0,0,0,0)",
          "rgba(100, 0, 0,1)",
          "rgb(228, 15, 0)",
          "rgb(255, 251, 98)",
          "rgb(255, 255, 255)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          10,
          25,
          50,
          75,
          100
        ],
        "isLeftCap": false,
        "ticks": "linear"
      }
    },
    "colorPrimary": "rgb(255,90,90)",
    "nameLegend": "Hourly Wildfire Potential",
    "namePublic": "Hourly Wildfire Potential",
    "nameShort": "HWP",
    "roundto": 1,
    "roundtoReadout": 0,
    "units": "%"
  },
  "ws": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          5,
          10,
          15,
          20,
          25,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100
        ],
        "colors": [
          "rgba(0,0,0,0)",
          "rgba(0,0,0,0)",
          "rgb(207,225,230)",
          "rgb(144,185,213)",
          "rgb(98,164,171)",
          "rgb(71,120,129)",
          "rgb(255,249,129)",
          "rgb(249,209,11)",
          "rgb(236,152,28)",
          "rgb(212,71,68)",
          "rgb(166,41,38)",
          "rgb(103,16,54)",
          "rgb(97,21,57)",
          "rgb(57,25,80)",
          "rgb(186,89,255)"
        ],
        "colorType": "scaleThreshold",
        "contourLevels": [
          5,
          10,
          15,
          20,
          25,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100
        ],
        "isLeftCap": false,
        "ticks": "linear"
      },
      "difference": {
        "colorLevels": [
          -30,
          -24,
          -20,
          -16,
          -12,
          -8,
          -4,
          4,
          8,
          12,
          16,
          20,
          24,
          30
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          4,
          8,
          12,
          16,
          20
        ]
      }
    },
    "colorPrimary": "rgb(0,255,50)",
    "nameLegend": "Wind Speed",
    "namePublic": "Wind Speed",
    "nameShort": "Wind",
    "roundto": 0,
    "units": "mph"
  },
  "ws250": {
    "defaults": "ws",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          20,
          40,
          60,
          80,
          100,
          120,
          140,
          160,
          180,
          200,
          220,
          240,
          260
        ],
        "contourLevels": [
          20,
          40,
          60,
          80,
          100,
          120,
          140,
          160,
          180,
          200,
          220,
          240,
          260
        ]
      },
      "difference": {
        "colorLevels": [
          -48,
          -40,
          -32,
          -24,
          -16,
          -8,
          8,
          16,
          24,
          32,
          40,
          48
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          8,
          16,
          24,
          32,
          40
        ]
      }
    },
    "nameLegend": "250 mb Wind Speed",
    "namePublic": "250 mb Wind Speed",
    "nameShort": "250 mb Wind",
    "units": "kts"
  },
  "ws500": {
    "defaults": "ws",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          10,
          20,
          30,
          40,
          50,
          60,
          80,
          100,
          120,
          140,
          160,
          180,
          200
        ],
        "contourLevels": [
          10,
          20,
          30,
          40,
          50,
          60,
          80,
          100,
          120,
          140,
          160,
          180,
          200
        ]
      },
      "difference": {
        "colorLevels": [
          -48,
          -40,
          -32,
          -24,
          -16,
          -8,
          -4,
          4,
          8,
          16,
          24,
          32,
          40,
          48
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          8,
          16,
          24,
          32,
          40
        ]
      }
    },
    "nameLegend": "500 mb Wind Speed",
    "namePublic": "500 mb Wind Speed",
    "nameShort": "500 mb Wind",
    "units": "kts"
  },
  "ws700": {
    "defaults": "ws",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160
        ],
        "contourLevels": [
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160
        ]
      },
      "difference": {
        "colorLevels": [
          -48,
          -40,
          -32,
          -24,
          -16,
          -8,
          8,
          16,
          24,
          32,
          40,
          48
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          8,
          16,
          24,
          32,
          40
        ]
      }
    },
    "nameLegend": "700 mb Wind Speed",
    "namePublic": "700 mb Wind Speed",
    "nameShort": "700 mb Wind",
    "units": "kts"
  },
  "ws850": {
    "defaults": "ws",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160
        ],
        "contourLevels": [
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160
        ]
      },
      "difference": {
        "colorLevels": [
          -30,
          -25,
          -20,
          -15,
          -10,
          -5,
          5,
          10,
          15,
          20,
          25,
          30
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          5,
          10,
          15,
          20,
          25
        ]
      }
    },
    "nameLegend": "850 mb Wind Speed",
    "namePublic": "850 mb Wind Speed",
    "nameShort": "850 mb Wind",
    "units": "kts"
  },
  "ws925": {
    "defaults": "ws",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160
        ],
        "contourLevels": [
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160
        ]
      },
      "difference": {
        "colorLevels": [
          -30,
          -25,
          -20,
          -15,
          -10,
          -5,
          5,
          10,
          15,
          20,
          25,
          30
        ]
      },
      "spread": {
        "colorLevels": [
          0,
          5,
          10,
          15,
          20,
          25
        ]
      }
    },
    "nameLegend": "925 mb Wind Speed",
    "namePublic": "925 mb Wind Speed",
    "nameShort": "925 mb Wind",
    "units": "kts"
  },
  "wg": {
    "defaults": "ws",
    "colorPrimary": "rgb(255,255,0)",
    "nameLegend": "Wind Gust",
    "namePublic": "Wind Gust",
    "nameShort": "Gust"
  },
  "mxws24": {
    "defaults": "ws",
    "nameLegend": "24 hr Max Wind",
    "namePublic": "24 hr Max Wind",
    "nameShort": "24hr Max Wind"
  },
  "mxwg24": {
    "defaults": "wg",
    "nameLegend": "24 hr Max Gust",
    "namePublic": "24 hr Max Gust",
    "nameShort": "24hr Max Gust"
  },
  "ws_trans": {
    "defaults": "ws",
    "colorPrimary": "rgb(150,255,0)",
    "nameLegend": "Transport Winds",
    "namePublic": "Transport Winds",
    "nameShort": "Trans Winds"
  },
  "ws30": {
    "defaults": "ws",
    "colorPrimary": "rgb(255, 255, 0)",
    "nameLegend": "30 m Winds",
    "namePublic": "30 m Winds",
    "nameShort": "30m Winds"
  },
  "ws80": {
    "defaults": "ws",
    "colorPrimary": "rgb(170, 170, 170)",
    "nameLegend": "80 m Winds",
    "namePublic": "80 m Winds",
    "nameShort": "80m Winds"
  },
  "wshr0-500mb": {
    "defaults": "ws",
    "colorPrimary": "rgb(170, 170, 170)",
    "nameLegend": "0-500mb Wind Shear",
    "namePublic": "0-500mb Wind Shear",
    "nameShort": "0-500mb Wind Shear",
    "units": "kts"
  },
  "wshr0-6km": {
    "defaults": "ws",
    "colorPrimary": "rgb(170, 170, 170)",
    "nameLegend": "0-6km Wind Shear",
    "namePublic": "0-6km Wind Shear",
    "nameShort": "0-6km Wind Shear",
    "units": "kts"
  },
  "wd": {
    "defaults": "default",
    "colorBars": {
      "default": {
        "colorLevels": [
          0,
          90,
          180,
          270,
          360
        ],
        "colors": [
          "rgba(20,80,181)",
          "rgba(100,227,100)",
          "rgba(242,205,88)",
          "rgba(190,10,10)",
          "rgba(20,80,181)"
        ],
        "colorType": "scaleLinear",
        "contourLevels": [
          0,
          45,
          90,
          180,
          225,
          270,
          360
        ],
        "isLeftCap": false,
        "isRightCap": false,
        "ticks": "byColorLevels"
      },
      "difference": {
        "colorLevels": [
          -135,
          -90,
          -60,
          -30,
          -20,
          -10,
          -5,
          5,
          10,
          20,
          30,
          60,
          90,
          135
        ]
      },
      "standardDeviation": {
        "colorLevels": [
          30,
          60,
          90,
          120
        ],
        "colors": [
          "rgba(150,150,150,0)",
          "rgb(0,230,255)",
          "rgb(255,255,100)",
          "rgb(255,100,100)",
          "rgb(255,100,100)",
          "rgb(255,100,100)"
        ],
        "colorType": "scaleThreshold",
        "ticks": "byColorLevels"
      }
    },
    "colorPrimary": "rgb(220,220,8)",
    "isZeroLowerBound": true,
    "nameLegend": "Wind Direction",
    "namePublic": "Wind Direction",
    "nameShort": "Dir",
    "roundto": 0,
    "units": "°"
  },
  "wshrd0-500mb": {
    "defaults": "wd",
    "colorPrimary": "rgb(170, 170, 170)",
    "nameLegend": "0-500mb Wind Shear Direction",
    "namePublic": "0-500mb Wind Shear Direction",
    "nameShort": "0-500mb Wind Shear Dir"
  },
  "wshrd0-6km": {
    "defaults": "wd",
    "colorPrimary": "rgb(170, 170, 170)",
    "nameLegend": "0-6km Wind Shear Direction",
    "namePublic": "0-6km Wind Shear Direction",
    "nameShort": "0-6km Wind Shear Dir"
  },
  "wd_trans": {
    "defaults": "wd",
    "colorPrimary": "rgb(150,255,0)",
    "nameLegend": "Transport Wind Dir",
    "namePublic": "Transport Wind Dir",
    "nameShort": "Trans Wind Dir"
  },
  "wd250": {
    "defaults": "wd",
    "nameLegend": "250 mb Wind Direction",
    "namePublic": "250 mb Wind Direction",
    "nameShort": "250 mb Dir"
  },
  "wd500": {
    "defaults": "wd",
    "nameLegend": "500 mb Wind Direction",
    "namePublic": "500 mb Wind Direction",
    "nameShort": "500 mb Dir"
  },
  "wd700": {
    "defaults": "wd",
    "nameLegend": "700 mb Wind Direction",
    "namePublic": "700 mb Wind Direction",
    "nameShort": "700 mb Dir"
  },
  "wd850": {
    "defaults": "wd",
    "nameLegend": "850 mb Wind Direction",
    "namePublic": "850 mb Wind Direction",
    "nameShort": "850 mb Dir"
  },
  "wd925": {
    "defaults": "wd",
    "nameLegend": "925 mb Wind Direction",
    "namePublic": "925 mb Wind Direction",
    "nameShort": "925 mb Dir"
  }
};

export default configFields;
