interface(topi).
interfaceAttribute(topi, i).
class(topc, topi).
classChild(topc, childsunroll0, topi).
classChild(topc, childsunroll1, topi).
classChild(topc, childsunroll2, topi).
classChild(topc, childsunrolln, topi).
classField(gensymattrib, gensymattrib) :- false.
classField(topc, gensymattrib).
classField(topc, fixed).
interfaceField(topi, display).
interfaceField(topi, refname).
assignment(topc, self, childs_i_step0, self, gensymattrib). %a27 childs@i
assignment(topc, self, childs_i_step1, self, childs_i_step0). %a28
assignment(topc, self, childs_i_step2, self, childs_i_step1). %a29
assignment(topc, self, childs_i_stepn, self, childs_i_step2). %a30
assignment(topc, childsunroll0, i, self, childs_i_step0). %a31b
assignment(topc, childsunroll1, i, self, childs_i_step1). %a32
assignment(topc, childsunroll2, i, self, childs_i_step2). %a33
assignment(topc, childsunrolln, i, self, childs_i_stepn). %a34
assignment(gensymattrib, gensymattrib, gensymattrib, gensymattrib, gensymattrib) :- false.
classAttribute(topc, childs_i_step0). %s2 childs@i
classAttribute(topc, childs_i_step1). %s3
classAttribute(topc, childs_i_step2). %s4
classAttribute(topc, childs_i_stepn). %s5
