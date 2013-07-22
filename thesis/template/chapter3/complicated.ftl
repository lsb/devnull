interface TopI {
	var count : int;
	var i : int;
	input fixeda : int;
	input fixedb : int;

}
class TopC : TopI { 
	attributes {
	}
	children {
		childs : [ TopI ];
	}
	actions {
		loop childs {
			childs.count := fold 0 .. childs$-.count + 1;
			childs.i := fold fixeda .. childs$-.i + childs$i.fixedb + childs$$.count;
		}
	}
}
