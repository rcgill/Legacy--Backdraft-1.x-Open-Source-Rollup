var require= {
  pageLoaded: 1,
  paths:{
    "i18n":"../../dojotoolkit/dojo/lib/plugins/i18n",
    "text":"../../dojotoolkit/dojo/lib/plugins/text",
    "com/altoviso/javaScriptApiRef":"./packages/bdRead/lib/docTypes/javaScriptApiRef"
  },

  packages:[{
    name:"bd",
    location:"../../backdraft"
  },{
    name:"dojo",
    location:"../../dojotoolkit/dojo",
    lib:".",
    main:"lib/main-browser",
    exclude:[/dojo\/tests\//, /\/robot(x)?/],
    copyDirs:[[".", ".", ["*/.*", "*/tests*" ]]]
  },{
    name:"dijit",
    location:"../../dojotoolkit/dijit",
    lib:".",
    main:"lib/main",
    exclude:[/dijit\/tests\//, /\/robot(x)?/],
    copyDirs:[[".", ".", ["*/.*", "*/tests*" ]]]
  },{
    name:"bdRead",
    location:"./packages/bdRead"
  }],

  deps:["bdRead"],

  build:{
    loaderConfig: {
      paths:{
        "com/altoviso/javaScriptApiRef":"./packages/bdRead/lib/docTypes/javaScriptApiRef"
      }
    },

    srcLoader:"../../bdLoad/lib/require.js",

    replacements: {
      "./bdRead.html": [
        ['css/tundra.css', "css/css.css"],
        ['<script src="config.js"></script>', ""],
        ["../../bdLoad/lib/require.js", "boot.js"]
      ]
    },

    cssCompactSet:{
      "./css/css.css":"./css/tundra.css"
    },


    layers:{
      bdRead:{
				include:[
          "bd/dijit/comboBox",
          "bd/widget/radioGroup",
          "bd/widget/checkBox",
          "dijit/form/ComboBox",
          "bd/widget/stateButton",
          "bd/widget/labeled",
          "dojo/regexp",
          "dijit/form/ValidationTextBox",
          "dijit/Tooltip",
          "bd/widget/root",
          "bd/widget/borderContainer",
          "bd/dijit/tree",
          "bd/widget/statusbar",
          "dijit/Tree",
          "dojo/fx",
          "dojo/DeferredList",
          "dojo/cookie",
          "dijit/tree/TreeStoreModel",
          "dijit/tree/ForestStoreModel",
          "dijit/tree/_dndSelector",
          "dojo/fx/Toggler",
          "dijit/tree/_dndContainer",
          "dojo/dnd/Container"],
        boot:"boot.js",
        bootText:"require(['bdRead']);\n"
      }
    }
  }
};


