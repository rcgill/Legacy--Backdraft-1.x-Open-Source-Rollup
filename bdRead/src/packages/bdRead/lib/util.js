///
// AMD id = bdRead/util
define(["bd", "./kernel", "bd/symbols"], function(bd, bdRead) {

//TODO make all external links open a new window.

var
format= function (s) {
  var args= arguments;
  return s.replace(/%(\d)/g, function(dummy, i) { return args[i]; });
},

genTag= function(
  tag,
  classes
) {
  return "<" + tag + (classes ? ' class="' + classes + '">' : ">");
},

genHtml= function(
  tag,        //(string) required
  classes,    //(string | falsy) required
  attributes, //(hash, optional)
  innerHtml   //(string)
) {
  //< ""
  //> innerHtml is falsy
  //< "<tag attributes>innerHtml</tag>"
  //> classes is falsey
  //< "<tag class="classes" attributes>innerHtml</tag>"
  //> classes is a string

  if (!innerHtml) {
    if (!attributes) {
      return "";
    }
    innerHtml= attributes;
    attributes= {};
  }
  if (classes) {
    attributes["class"]= classes;
  }
  var result= "<" + tag;
  for (var p in attributes) {
    result+= " " + p + '="' + attributes[p] + '"';
  }
  return result + ">" + innerHtml + "</" + tag + ">";
},

genSpan= function(
  classString,
  text
) {
  return format("<span class=\"%1\">%2</span>", classString, text);
},

genClickSpan= function(
  uid,
  text
) {
  return "<span class='click_" + uid + "'>" + text + "</span>";
},

codeDelimiter= {},
standinDelimiter= {},
transformCodeAndStandin= function(
  text
) {
  var
    token,
    inCode= 0,
    inStandin= 0,
    next= function() {
      var match= text.substring(p).match(/^((`([^`]|$))|(``([^`]|$))|(```)|(\\`))/);
      //                                   12 3         4  5         6     7
      if (match) {
        if (match[2]) {
          //got a /`[^`]/
          p+= 1;
          return codeDelimiter;
        } else if (match[4]) {
          //gat a /``[^`]/
          p+= 2;
          return standinDelimiter;
        } else if (match[6]) {
          //got a /```/
          if (inStandin) {
            p+= 2;
            return standinDelimiter;
          } else {
            p+= 1;
            return codeDelimiter;
          }
        } else {
          //got a /\\`/
          p+= 1;
          return "`";
        }
      } else {
        return text.charAt(p++);
      }
    },
    findStandinClose= function() {
      inStandin= 1;
      result+= (inCode ? "<span class=\"code standin\">" : "<span class=\"standin\">");
      while (p<length) {
        token= next();
        if (token===standinDelimiter) {
          inStandin= 0;
          result+= "</span>";
          return;
        } else {
          result+= ((inCode && token=="<") ? "&lt;" : token);
        }
      }
      //shouldn't get here; graceful recovery...
      result+= "</span>";
    },    
    findCodeClose= function(start) {
      inCode= 1;
      result+= "<span class=\"code\">";
      while (p<length) {
        token= next();
        if (token===codeDelimiter) {
          result+= "</span>";
          inCode= 0;
          return;
        } else if (token==standinDelimiter) {
          findStandinClose();
        } else if (token=="<") {
          result+= "&lt;";
        } else {
          result+= token;
        }
      }
      //shouldn't get here; graceful recovery...
      result+= "</span>";
    },
    p= 0,
    length= text.length,
    result= "";
  while (p<length) {
    token= next();
    if (token===codeDelimiter) {
      findCodeClose();
    } else if (token===standinDelimiter) {
      findStandinClose();
    } else {
      result+= token;
    }
  }
  return result;
},

genMarkdown= function(
  text
) {
  if (text) {
    return bdRead.markdownConverter(text);
  } else {
    return "";
  }
},

genRow= function(
  columnValues,
  columnClasses
) {
  var result= "";
  for (var i= 0, end= columnValues.length; i<end; i++) {
    result+= genTag("td", columnClasses[i]) + columnValues[i] + "</td>";
  }
  return "<tr>" + result + "</tr>";
},

genHeaderRow= function(
  columnValues,
  spans
) {
  var result= "";
  for (var i= 0, end= columnValues.length; i<end; i++) {
    if (columnValues[i]) {
      result+= '<th' + (spans[i] ? ' colspan="' + spans[i] + '">' : '>') + columnValues[i] + '</th>';
    }
  }
  return result ? "<tr>" + result + "</tr>" : "";
},

//
// html creators...
//

//(minimum of anything) followed by (name. [name. [name. [...]]]name)
//TODO "Now is the time to find bd.findFirst." causes a problem.
jsnameRegEx= /([^\w\.]*)(\w+\.[\w\.]*\w)/m,
//jsnameRegEx= /(^|\s)(\w+\.[\w\.]*\w)/m,

genH2Section= function(
  doci,
  title,
  classString,
  text
) {
  if (text) {
    return genHtml("h2", 0, title) + genHtml("div", classString, text);
  } else {
    return "";
  }
},
 
genLinks= function(
  doci,
  text,
  link
) {
  var
    target,
    match,
    result= "";
  text= transformCodeAndStandin(text);
  if (!link) {
    return text;
  }
  while (text.length) {
    match= text.match(jsnameRegEx);
    if (match) {
      result+= text.substr(0, match.index);
      target= bdRead.getDociByName(match[2], doci);
      if (target.uid) {
        result+= match[1] + genClickSpan(target.uid, match[2]);
      } else {
        result+= match[0];
      }
      text= text.substr(match.index + match[0].length);
    } else {
      return result + text;
    }
  }
  return result;
},

genLink= function(
  doci,
  text
) {
  var target= bdRead.getDociByName(text, doci);
  if (target.uid) {
    return genClickSpan(target.uid, text);
  } else {
    return transformCodeAndStandin(text);
  }
},

MU= 1,
MD= 2,
CASE= 3,
NOTE= 4,
WARN= 5,
CODE= 6,
TODO= 7,
TODOC= 8,
INOTE= 9,
PRIVATE= 10,
 
lessthan_g= /</g, // matches the "<" character
amp_g= /&/g,      // matches the "&" character

escapeHtml= function(
  source
) {
  return source ? source.replace(amp_g, "&amp;").replace(lessthan_g, "&lt;") : "";
},

genChunk= function(
  doci,
  chunk, //chunk is the pair [pragma.text] of just text
  linkChunk
) {
  if (!chunk.length) {
    return "";
  } else if (chunk.charAt) {
    //a string; treat as markdown...
    return genMarkdown(genLinks(doci, chunk, linkChunk));
  } else {
    switch (chunk[0]) {
      case WARN: 
      return genHtml("div", "warn", genMarkdown(genLinks(doci, chunk[1], linkChunk)));

      case NOTE: 
      return genHtml("div", "note", genMarkdown(genLinks(doci, chunk[1], linkChunk)));

      case PRIVATE: 
      return genHtml("div", "private", '<p class="private">Private</p>' + genMarkdown(genLinks(doci, chunk[1], linkChunk)));

      case MD:   
      return genMarkdown(genLinks(doci, chunk[1], linkChunk));

      case CODE: 
      return genHtml("div", "codeSample", escapeHtml(chunk[1]));

      default:   
      return (genLinks(doci, chunk[1], linkChunk));
    }
  }
},

genSection= function(
  doci,
  section, //section is a vector of chunks
  linkSection
) {
  if (!section) {
    return "";
  } else {
    var result= "";
    bd.forEach(section, function(chunk) {
      result+= genChunk(doci, chunk, linkSection);
    });
    return result;
  }
},

genTitle= function(
  doci,
  typeText,
  name
) {
  return genHtml("h1", 0, (typeText ? genSpan("label", typeText) : "") + " " + name);
},

genSdoc= function(
  doci,
  section
) {
  return genHtml("div", "sdoc", genSection(doci, section, true));
},

genLdoc= function(
  doci,
  section
) {
  return genH2Section(doci, "Description", "ldoc", genSection(doci, section, true));
},

genOverloadLdoc= function(
  doci,
  sig,
  overloadDoci
) {
  return genH2Section(doci, "Overload Signature: " + sig, "ldoc", genSection(doci, overloadDoci.sdoc.concat(overloadDoci.ldoc), true));
},

genSynopsis= function(
  doci,
  text,
  codeStyle
) {
  var module, resource, target;
  if (doci.module) {
    module= doci.module;
    target= bdRead.getDociByName("modules." + module, doci);
    if (target && target.uid) {
      module= genClickSpan(target.uid, module);
    }
  }
  if (doci.src) {
    resource= doci.src;
    target= bdRead.getDociByName("resources." + resource, doci);
    if (target && target.uid) {
      resource= genClickSpan(target.uid, resource);
    }
  }
  var result= (text ? genHtml("div", codeStyle || "codeSynopsis", text) : "");
  if (module && resource) {
    result+= genHtml("div", "origin", "Defined by module " + module + " in resource " + resource + ".");
  } else if (module) {
    result+= genHtml("div", "origin", "Defined by module " + module + ".");
  } else if (resource) {
    result+= genHtml("div", "origin",  "Defined in resource " + resource + ".");
  }
  return result && (genHtml("h2", 0, "Synopsis") + result);
},

genCode= function(
  doci,
  text
) {
  return genH2Section(doci, "Code", "code", text);
},

genIndexTable= function(
  doci,
  collection, //(hash of docItem) The set of document items to consider when filtering
  groups,     //(array of hash of {title:<section-title>, type:<type>, emptyContent:<single-row message to give for empty section>})
  decorator   //(function, optional) Decorates the name 
) {
  ///
  // Creates a two-column, multi-section table. 
  ///
  // Each section contains a set of doc items with the same type. The sections or arranged and
  // titled as given by groups. The items within a group contain a name and sdoc column, and 
  // are sorted by doc item name.

  //groups.type is a bd.symbol
  //create a new, unique container for each of the types mentioned in groups...
  var uid= bd.uid();
  bd.forEach(groups, function(group) {
    group.type[uid]= [];
  });

  //fill the containers with references to the objects of that type that exist in collection...
  bd.forEachHash(collection, function(item, name) {
    var collection= item.type[uid];
    if (collection) {
      collection.push({item:item, uid:item.uid, name:name, sdoc:item.sdoc});
    }
  });

  var result= "";
  bd.forEach(groups, function(group) {
    var container= group.type[uid];
    if (container.length) {
      //non-empty group...
      result+= genHeaderRow([group.title], [2]);
      container.sort(function(lhs, rhs) {
        return lhs.name<rhs.name ? -1 : (lhs.name>rhs.name ? 1 : 0); 
      });
      bd.forEach(container, function(item) {
        result+= genRow([decorator(genClickSpan(item.uid, item.name), item.item), genSection(doci, item.sdoc || "", true)], [0, 0]);
      });
    } else {
      //empty group...
      if (group.emptyContent) {
        result+= genHeaderRow([group.title], [2]);
        result+= format('<tr><td colspan="2" class="empty">%1</td></tr>', group.emptyContent);
      }
    }
    //clean up the scratch containers we made...
    delete container;
  });
  return result ? genHtml("table", "d1", result) : "";
},

genIndex= function(
  doci,
  title,
  collection, //(hash of doci) The set of document items to consider when filtering
  groups,      //(array of hash of {title:<section-title>, type:<type>, emptyContent:<single-row message to give for empty section>})
  decorator
) {
  var result= genIndexTable(doci, collection, groups, decorator || function(s){return s;});
  return genH2Section(doci, title, 0, result);
},

genIndex2= function(
  doci,
  title,
  content //(vector of {title:string, content:vector of [column1, column2], emptyMessage:string}
) {
  var result= "";
  bd.forEach(content, function(section) {
    if (section.content.length) {
      result+= genHeaderRow([section.title], [2]);
      bd.forEach(section.content, function(row) {
        result+= genRow([row[0], row[1]], [0, 0]);
      });
    } else if (section.emptyMessage) {
      result+= genHeaderRow([group.title], [2]);
      result+= format('<tr><td colspan="2" class="empty">%1</td></tr>', section.emptyMessage);
    }
  });
  if (result) {
    return genH2Section(doci, title, 0, genHtml("table", "d1", result));
  } else {
    return "";
  }
},

genIndex3= function(
  doci,
  title,
  content //(vector of {title:string, content:vector of [column1, column2, column3], emptyMessage:string}
) {
  var result= "";
  bd.forEach(content, function(section) {
    if (section.content.length) {
      result+= genHeaderRow([section.title], [3]);
      bd.forEach(section.content, function(row) {
        result+= genRow([row[0], row[1], row[2]], [0, 0, 0]);
      });
    } else if (section.emptyMessage) {
      result+= genHeaderRow([group.title], [3]);
      result+= format('<tr><td colspan="3" class="empty">%1</td></tr>', section.emptyMessage);
    }
  });
  if (result) {
    return genH2Section(doci, title, 0, genHtml("table", "d1", result));
  } else {
    return "";
  }
},

genParamsTable= function(
  doci,
  params,
  headerRow
) {
  var 
    genInfoRows= function(
      types
    ) {
      if (types.length==0) {
        return ['<td colspan="2">no documentation available</td>'];
      } else {
        var 
          rows= [],
          generalSection= null;
        bd.forEach(types, function(type) {
          //type is [type, section]; type of "" is general section
          if (type[0]=="") {
            generalSection= '<td class="generalSection" colspan="2">' + genSection(doci, type[1], true) + "</td>";
          } else {
            //the type docs always go in order...
            var 
              typeName= type[0]=="kwargs" ? doci.name + ".kwargs" : type[0],
              doc= type[1];
            if (doc.length==0) {
              //no doc given for the parameter; grab the sdoc for the type iff available...
              doc= bdRead.getDociByName(typeName, doci);
              doc= doc && doc.sdoc;
            }
            rows.push(format('<td class="type">%1</td><td class="typeSection">%2</td>', genLink(doci, typeName), genSection(doci, doc, true)));
          }
        });
        if (generalSection) {
          rows.push(generalSection);
        }
        return rows;
      }
    },
    result= "",
    trClassSuffix= " first";

  var 
    isReference= function(name) {
      return name.charAt(0)=="*";
    },

    getReferenceTypes= function(typeName, doci) {
      //return the vector of types referenced by typeName
      var 
        result= [],
        dotIndex= typeName.lastIndexOf("."),
        functionName= typeName.substring(1, dotIndex),
        paramName= typeName.substring(dotIndex+1),
        functionDoc= bdRead.getDociByName(functionName, doci),
        types= bd.findFirst(
          functionDoc && functionDoc.params, 
          function(param){return param[0]==paramName;},
          function(param){return param[1];});
      if (types!=-1) {
        //types is a vector of [type, section]
        bd.forEach(types, function(type) {
          if (isReference(type[0])) {
            result= result.concat(getReferenceTypes(type[0], doci));
          } else {
            result.push(type);
          }
        });
      }
      return result;
    };

  bd.forEach(params, function(param) {
    //param is [name, types]
    var types= [];
    bd.forEach(param[1], function (type) {
      //type is [type, section]; 
      //if type is of the form "*<fname>.<pname>", then use the documentation for parameter pname in function fname
      if (isReference(type[0])) {
        types= types.concat(getReferenceTypes(type[0], doci));
      } else {
        types.push(type);
      }
    });
    var paramInfoRows= genInfoRows(types);
    result+= format('<tr class="param%1"><td class="name" rowspan="%2">%3</td>%4</tr>', trClassSuffix, paramInfoRows.length, param[0], paramInfoRows[0]);
    trClassSuffix= "";
    for (var i= 1; i<paramInfoRows.length; i++) {
      result+= "<tr>" + paramInfoRows[i] + "</tr>";
    }
  });
  return result ? (genTag("table", "d1 params") + genHeaderRow(headerRow, [0, 0, 0]) + result + "</table>") : "";
},

genParams= function(
  doci,
  params
) {
  return genH2Section(doci, "Parameters", 0, genHtml("div", 0, genParamsTable(doci, params, ["Name", "Type(s)", "Semantics"])));
},

genHashProps_= function(
  doci,
  props,
  headerRow
) {
  if (!props) {
    return "";
  }
  //props is a vector of [<name>, {..., types:[...], ...}, ...]
  //convert it to look like a parameter vector and then use the parameter routines to build the table
  var propName, propDoc, propTypes, paramVector= [];
  for (var i= 0, end= props.length; i<end;) {
    propName= props[i++];
    propDoc= props[i++];
    propTypes= propDoc.types || [];
    if (propDoc.sdoc || propDoc.ldoc) {
      propTypes.push(["", (propDoc.sdoc || []).concat(propDoc.ldoc || [])]);
    }
    if (propTypes.length==0) {
      propTypes.push(["", "No documentation available."]);
    }
    paramVector.push([escapeHtml(propName), propTypes]);
  }
  return genH2Section(doci, "Properties", 0, genHtml("div", 0, genParamsTable(doci, paramVector, headerRow)));
},

genHashProps= function(
  doci,
  props
) {
  return genHashProps_(doci, props, ["Name", "Type(s)", "Semantics"]);
},

genEnumProps= function(
  doci,
  props
) {
  return genHashProps_(doci, props, ["Name", "Value", "Semantics"]);
},

genReturnsTable= function(
  doci,
  returns
) {
  var
    gotAtLeastOneCase= false, 
    sortedItems= [];
  bd.forEach(returns, function(item) {
    //item is [<type>, <section>]
    var 
      itemSemantics= [],
      valueSection= [];
    sortedItems.push([item[0], itemSemantics]);
    bd.forEach(item[1], function(chunk) {
      //chunk is either a string (markdown) or [pragma, string]
      if (chunk[0]===CASE) {
        itemSemantics.push([valueSection, chunk]);
        valueSection= [];
        gotAtLeastOneCase= true;
      } else {
        valueSection.push(chunk);
      }
    });
    if (valueSection.length) {
      itemSemantics.push([valueSection, null]);
    }
  });

  var
    result= "",
    trClassSuffix= " first";
  bd.forEach(sortedItems, function(item) {
    //item is [<type:string>, vector of [<value:section>, <case:chunk|null>]]
    var rows= [];
    bd.forEach(item[1], function(value) {
      var row=  "<td>" + genSection(doci, value[0], true) + "</td>";
      if (gotAtLeastOneCase) {
        row+= "<td>" + (value[1] ? genChunk(doci, value[1], true) : "") + "</td>";
      }
      rows.push(row);
    });
    result+= format('<tr class="result%1"><td class="name" rowspan="%2">%3</td>%4</tr>', trClassSuffix, rows.length, genLinks(doci, item[0]), rows[0]);
    trClassSuffix= "";
    for (var i= 1; i<rows.length; i++) {
      result+= "<tr>" + rows[i] + "</tr>";
    }
  });
  if (result) {
    return genTag("table", "d1 results") + 
      (gotAtLeastOneCase ? genHeaderRow(["Type", "Semantics", "Condition"], [0, 0, 0]) : genHeaderRow(["Type", "Semantics"], [0, 0])) +
      result + "</table>";
  } else {
    return "";
  }
},

genReturns= function(
  doci,
  returns
) {
    return genH2Section(doci, "Returns", 0, genHtml("div", 0, genReturnsTable(doci, returns)));
},

genExceptions= function(
  doci,
  exceptions    
) {
  return genH2Section(doci, "Exceptions", 0, genHtml("div", 0, genReturnsTable(doci, exceptions)));
},

genTypes= function(
  doci,
  types    
) {
  return genH2Section(doci, "Types", 0, genHtml("div", 0, genReturnsTable(doci, types)));
},

creators= bdRead.pageSectionCreators= {
  genLinks:genLinks,
  genChunk:genChunk,
  genSection:genSection,
  genTitle:genTitle,
  genSdoc:genSdoc,
  genLdoc:genLdoc,
  genOverloadLdoc:genOverloadLdoc,
  genSynopsis:genSynopsis,
  genCode:genCode,
  genReturns:genReturns,
  genExceptions:genExceptions,
  genTypes:genTypes,
  genIndex:genIndex,
  genIndex2:genIndex2,
  genIndex3:genIndex3,
  genParams:genParams,
  genHashProps:genHashProps,
  genEnumProps:genEnumProps,
  genH2Section:genH2Section
};

bdRead.generatePageContent= function(
  doci,
  program
) {
  var result= "";
  bd.forEach(program, function(line) {
    if (line[0]) {
      result+= creators[line[0]].apply(this, [doci].concat(line.slice(1)));
    }
  });
  return result;
};

bdRead.util= bd.mix(bdRead.util || {}, {
  format:format,
  genHtml:genHtml,
  genSpan:genSpan,
  genClickSpan:genClickSpan,
  genSection:genSection
});

});
// Copyright (c) 2009, Altoviso, Inc. (www.altoviso.com). Use, modification, and distribution subject to terms of license.

