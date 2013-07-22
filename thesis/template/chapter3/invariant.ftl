interface TopI {
	var i : int;
}
class TopC : TopI { 
	attributes {
		input fixed : int;
	}
	children {
		childs : [ TopI ];
	}
	actions {
		loop childs {
			childs.i := 20;
		}
	}
}
