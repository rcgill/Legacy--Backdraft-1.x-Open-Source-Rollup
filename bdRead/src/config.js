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
    main:"lib/main-browser"
  },{
    name:"dijit",
    location:"../../dojotoolkit/dijit",
    lib:".",
    main:"lib/main"
  },{
    name:"bdRead",
    location:"./packages/bdRead"
  }],

  deps:["bdRead"],

  build:{
		files:[
      // the loader...
      ["../../bdLoad/lib/require.js", "./require.js"]
    ],

    destPaths:{
      // put i18n and text in the root of the default package
    },

    loaderConfig: {
      pageLoaded: 1,
      paths:{
        "com/altoviso/javaScriptApiRef":"./packages/bdRead/lib/docTypes/javaScriptApiRef"
      }
    },

	  packages:[{
      // since dojo uses the "text!" and "i18n!" plugin, and these are not really in the default package tree
      // we must tell bdBuild to discover them by explicitly asking for them which will cause paths
      // to be inspected
      name:"*",
      modules:{
        i18n:1,
        text:1
      }
    },{
  		name:"dijit",
      trees:[
        // this is the lib tree without the svn, tests, or robot modules
        [".", ".", "*/.*", "*/dijit/tests/*", /\/robot(x)?/]
      ]
  	},{
  		name:"dojo",
      trees:[
        // this is the lib tree without the tests, svn, plugins, or temp files
        [".", ".", "*/dojo/tests/*", /\/robot(x)?/, "*/.*", "*/dojo/lib/plugins"]
      ]
  	}],

    replacements: {
      "./bdRead.html": [
        ['css/tundra.css', "css/tundra.css"],
        ['<script src="config.js"></script>', ""],
        ["../../bdLoad/lib/require.js", "boot.js"]
      ]
    },

    compactCssSet:{
      "./css/tundra.css":1
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
    },

    dojoPragmaKwArgs:{
      asynchLoader:1
    }
  }
};


