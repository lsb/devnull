//@type action
function topc_childs_i () { return 20; }
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

(function () {
    var children = getChildren(node, "childs", false);
    for (var i = 0; i < children.length; i++) {
      var child = children[i]; 
      setAttribSafe(child, "i", (20));
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
