interface Top {
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
			childs.i := fold 0 .. 10;
		}
	}
}
