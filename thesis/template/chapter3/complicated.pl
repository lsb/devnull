interface(topi).
interfaceAttribute(topi, count).
interfaceAttribute(topi, i).
class(topc, topi).
classChild(topc, childsunroll0, topi).
classChild(topc, childsunroll1, topi).
classChild(topc, childsunroll2, topi).
classChild(topc, childsunrolln, topi).
classField(gensymattrib, gensymattrib) :- false.
classField(topc, gensymattrib).
interfaceField(topi, fixeda).
interfaceField(topi, display).
interfaceField(topi, refname).
interfaceField(topi, fixedb).
assignment(topc, self, childs_count_step0, self, gensymattrib). %a27 childs@count
assignment(topc, self, childs_count_step1, self, childs_count_step0). %a28
assignment(topc, self, childs_count_step2, self, childs_count_step1). %a29
assignment(topc, self, childs_count_stepn, self, childs_count_step2). %a30
assignment(topc, childsunroll0, count, self, childs_count_step0). %a31b
assignment(topc, childsunroll1, count, self, childs_count_step1). %a32
assignment(topc, childsunroll2, count, self, childs_count_step2). %a33
assignment(topc, childsunrolln, count, self, childs_count_stepn). %a34
assignment(topc, self, childs_i_step0, self, fixeda). %a18
assignment(topc, self, childs_i_step0, self, childs_count_stepn). %a16
assignment(topc, self, childs_i_step0, self, childs_fixedb_step0). %a8
assignment(topc, self, childs_i_step1, self, childs_fixedb_step1). %a9
assignment(topc, self, childs_i_step2, self, childs_fixedb_step2). %a10
assignment(topc, self, childs_i_stepn, self, childs_fixedb_stepn). %a11
assignment(topc, self, childs_i_step0, self, gensymattrib). %a27 childs@i
assignment(topc, self, childs_i_step1, self, childs_i_step0). %a28
assignment(topc, self, childs_i_step2, self, childs_i_step1). %a29
assignment(topc, self, childs_i_stepn, self, childs_i_step2). %a30
assignment(topc, childsunroll0, i, self, childs_i_step0). %a31b
assignment(topc, childsunroll1, i, self, childs_i_step1). %a32
assignment(topc, childsunroll2, i, self, childs_i_step2). %a33
assignment(topc, childsunrolln, i, self, childs_i_stepn). %a34
assignment(topc, self, childs_fixedb_step0, self, gensymattrib). %a27 childs@fixedb
assignment(topc, self, childs_fixedb_step1, self, childs_fixedb_step0). %a28
assignment(topc, self, childs_fixedb_step2, self, childs_fixedb_step1). %a29
assignment(topc, self, childs_fixedb_stepn, self, childs_fixedb_step2). %a30
assignment(topc, self, childs_fixedb_step0, childsunroll0, fixedb). %a45
assignment(topc, self, childs_fixedb_step1, childsunroll1, fixedb). %a46
assignment(topc, self, childs_fixedb_step2, childsunroll2, fixedb). %a47
assignment(topc, self, childs_fixedb_stepn, childsunrolln, fixedb). %a48
assignment(gensymattrib, gensymattrib, gensymattrib, gensymattrib, gensymattrib) :- false.
classAttribute(topc, childs_fixedb_step0). %s2 childs@fixedb
classAttribute(topc, childs_fixedb_step1). %s3
classAttribute(topc, childs_fixedb_step2). %s4
classAttribute(topc, childs_fixedb_stepn). %s5
classAttribute(topc, childs_i_step0). %s2 childs@i
classAttribute(topc, childs_i_step1). %s3
classAttribute(topc, childs_i_step2). %s4
classAttribute(topc, childs_i_stepn). %s5
classAttribute(topc, childs_count_step0). %s2 childs@count
classAttribute(topc, childs_count_step1). %s3
classAttribute(topc, childs_count_step2). %s4
classAttribute(topc, childs_count_stepn). %s5
