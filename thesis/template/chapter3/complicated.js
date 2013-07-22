function isInorder(node, pass) {
  switch (pass) {
    case 0:
     throw "did not expect inorder call for pass 0";
    default: throw ("unknown pass " + pass);
  }
}
///// pass /////
function visit_topc_0(node) {
  logger.log("  visit  TopC (id: " + node.id + "): " + 0);

  setAttribSafe(node, "childs_count_init", (0));
  setAttribSafe(node, "childs_count_last", getAttribSafe(node, "childs_count_init"));
  logger.log("      init childs@count: " + getAttribSafe(node, "childs_count_init"));
  logger.log("    last init childs_count_last: " + getAttribSafe(node, "childs_count_last"));
  (function () {
    var children = getChildren(node, "childs", false);
    for (var i = 0; i < children.length; i++) {
      var child = children[i]; 
      setAttribSafe(child, "count", (getAttribSafe(i == 0 ? node : children[i-1], i == 0 ? ("childs_count_init") : ("count")) + 1));
      logger.log("         step childs@count: " + getAttribSafe(child, "count"));
      if (i + 1 == children.length) {
        setAttribSafe(node, "childs_count_last", getAttribSafe(child, "count"));
        logger.log("    childs@count: " + getAttribSafe(node, "childs_count_last"));
      }
    }
  })();


  setAttribSafe(node, "childs_i_init", (getAttribSafe(node, "fixeda") ));
  setAttribSafe(node, "childs_i_last", getAttribSafe(node, "childs_i_init"));
  logger.log("      init childs@i: " + getAttribSafe(node, "childs_i_init"));
  logger.log("    last init childs_i_last: " + getAttribSafe(node, "childs_i_last"));
  (function () {
    var children = getChildren(node, "childs", false);
    for (var i = 0; i < children.length; i++) {
      var child = children[i]; 
      setAttribSafe(child, "i", (getAttribSafe(i == 0 ? node : children[i-1], i == 0 ? ("childs_i_init") : ("i")) + getAttribSafe(child, "fixedb") + getAttribSafe(node, "childs_count_last") ));
      logger.log("         step childs@i: " + getAttribSafe(child, "i"));
    }
  })();

  return true;
}
function visit_0 (node, isGlobalCall, parent) {
  if (node.nodeType == 1) {
    switch (node.tagName.toLowerCase()) {
      case "topc":
        logger.log("global: " + isGlobalCall + ", parent: " + parent);
        return visit_topc_0(node);
    }
  }
  if (node.nodeType == 3) { logger.log("skipping text node 2"); return; }
  throw ("unknown node type for dispatch: " + node.tagName);
}
function layout (root) {
  inherit(visit_0, root);
}
