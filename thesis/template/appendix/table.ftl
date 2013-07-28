\begin{lstlisting}[mathescape]
schedule { 
   "P = [(_,td,_,_,_),(_,td,_,_,_),(_,bu,_,_,_),(_,td,_,_,_),
         (_,td,_,_,_),(_,bu,_,_,_),(_,td,_,_,_)]"
}

/*****
standard interfaces and traits
******/
interface Node { 
  var canvas : int;
  var render : int;
  input height : ?int;
  var intrinsHeight : int;
  var computedHeight : int;
  var relRightX : int;
  var relX : int;
  var absX : int;
  var relBotY : int;
  var relY : int;
  var absY : int;  

  input minWidth : ?int;
  input maxWidth : ?int;
  input percentWidth : ?int; 
  input width : ?int;
  var intrinsPrefWidth : int;
  var intrinsMinWidth : int;
  var availableWidth : int;
  var computedWidth : int;
  
  var lineH : int;
}

trait shrinkToFitHeightWidth {
  actions {
    computedWidth := 
      !isEmptyInt(width) ?
        valueInt(width) :
      (!isEmptyInt(percentWidth) ?
        (0.01 * valueInt(percentWidth) * availableWidth) :                
      min(
        max(
          max(intrinsMinWidth, !isEmptyInt(minWidth) ? valueInt(minWidth) : 0), 
          availableWidth), 
        min(intrinsPrefWidth, !isEmptyInt(maxWidth) ? valueInt(maxWidth) : intrinsPrefWidth)));
    computedHeight := isEmptyInt(height) ? intrinsHeight : valueInt(height);
  }
}

trait relToAbsChilds {
  actions {
    loop childs {
      childs.absY := absY + childs$\$$i.relY;
      childs.absX := absX + childs$\$$i.relX;           
    }
  }
}

trait strokeBox {
  actions {
    render := 
      canvas
      + paintLine (absX, absY, absX+computedWidth, absY, borderc) //top
      + paintLine (absX+computedWidth, absY, absX+computedWidth, absY+computedHeight, borderc)
      + paintLine (absX+computedWidth, absY+computedHeight, absX, absY+computedHeight, borderc)
      + paintLine (absX, absY+computedHeight, absX, absY, borderc); //left
  }
}

trait countChilds {
  attributes {
    var numChilds : int;
  }
  actions {
    loop childs {
      numChilds := fold 0 .. $\$$$-$.numChilds + 1;
    }
  }
}
      


/****************************
some typical fully$-$handled box nodes
***************************/
interface Root { 
  input w : int = 100;
  input h : int = 100;
}

class Top : Root {
  children { child : Node }
  actions {
    child.relRightX := 0;
    child.relX := 0;
    child.absX := 0;
    child.relBotY := 0;
    child.relY := 0;
    child.absY := 0;
    child.canvas := paintStart(child.computedWidth, child.computedHeight);    
    child.availableWidth := w; //FIXME
  }
}



trait Wrapping {
  children { childs : [ Node ]; }
  actions {  
    loop childs {
      intrinsPrefWidth := 
        fold 
          ($\$$$\$$.numChilds == 0 ? 10 : 5) 
          .. 
          self$\$$$-$.intrinsPrefWidth + childs$\$$i.intrinsPrefWidth + 5;
      intrinsMinWidth := 
        fold 
          ($\$$$\$$.numChilds == 0 ? 10 : 5) 
          .. 
          max(self$\$$$-$.intrinsMinWidth, 5 + childs$\$$i.intrinsMinWidth + 5);

      childs.relRightX := 
        fold 
          0 .. 
          (childs$\$$$-$.relRightX + 5 + childs$\$$i.computedWidth > computedWidth) ?
            (5 + childs$\$$i.computedWidth) : (childs$\$$$-$.relRightX + 5 + childs$\$$i.computedWidth);
      childs.relX := childs$\$$i.relRightX $-$ childs$\$$i.computedWidth;
            
      childs.lineH := fold 0 
          .. childs$\$$i.relX == 5 ? 
            childs$\$$i.computedHeight 
            : (childs$\$$i.computedHeight > childs$\$$$-$.lineH ? 
               childs$\$$i.computedHeight : childs$\$$$-$.lineH);         
      childs.relY := fold 0
          .. childs$\$$$-$.relY + (childs$\$$i.relX == 5 ? childs$\$$$-$.lineH + 5 : 0);
      childs.relBotY := fold 0 .. childs$\$$i.relY + childs$\$$i.computedHeight;
      childs.canvas := fold render .. childs$\$$$-$.canvas;      
      intrinsHeight := fold 10 .. childs$\$$i.relY + childs$\$$i.lineH + 5;      
      childs.availableWidth := computedWidth $-$ 10;
    }
  }
}


/****
table stuff
*****/

interface CellI { 

    input colSpan : ?int;
    input rowSpan : ?int;
    
    //Node
    var canvas : int;
    var render : int;
    input height : ?int;
    var intrinsHeight : int;
    var computedHeight : int;
    var relX : int;
    var absX : int;
    var relBotY : int;
    var relY : int;
    var absY : int;  
    

    input width : ?int;
    input minWidth : ?int;
    input maxWidth : ?int;    
    input percentWidth : ?int; 
    var intrinsPrefWidth : int;
    var intrinsMinWidth : int;
    var availableWidth : int;
    var computedWidth : int;
    
    var cellNum : int;
    var column : int;
    var row : int;

}
interface RowI { 
  var intrinsColCount : int;
  var colCount : int;
  input height : ?int;
  var intrinsHeight : int;
  var computedHeight : int;
  var relBotY : int;
  var relY : int;
  var absY : int;
  var absX : int;
  
  var rowNum : int;
  var cells : int;
  var colAssignment : int;

  var canvas : int;
  var render : int;

  var computedWidth : int;
  var tableContentWidth : int;

}


class Cell(shrinkToFitHeightWidth, relToAbsChilds, strokeBox, countChilds, Wrapping) : CellI {
  attributes { 
    input borderc : color = #777;        
  }
}

class Row : RowI {
  attributes {
    input borderc : color = #070;
  }
  children {
    childs : [ CellI ];
  }
  phantom { //do not emit code for these
    childs.relX;
    childs.absX;
    childs.availableWidth;
  }
  actions {
    loop childs {
      intrinsColCount := 
        fold 0 .. $\$$$-$.intrinsColCount + 
          (isEmptyInt(childs$\$$i.colSpan) ? 1 : valueInt(childs$\$$i.colSpan));
      intrinsHeight := 
        fold 10 
        .. 
        (isEmptyInt(childs$\$$i.rowSpan) || valueInt(childs$\$$i.rowSpan) == 1) ?
        max($\$$$-$.intrinsHeight, childs$\$$i.computedHeight + 10)
        : $\$$$-$.intrinsHeight;
      childs.relBotY := fold 0 .. 5 + childs$\$$i.computedHeight;
      childs.relY := fold 0 .. 5;
      childs.absY := absY + childs$\$$i.relY;      
    }    
    computedHeight := isEmptyInt(height) ? intrinsHeight : valueInt(height);

    loop childs {
      computedWidth := fold 0 .. $\$$$-$.computedWidth + childs$\$$i.intrinsMinWidth;
    }
    
    loop childs {
      cells := 
        fold 
          mtIntPairList() 
          .. 
          appendIntPairList(
            $\$$$-$.cells, 
            pairInt(
              isEmptyInt(childs$\$$i.rowSpan) ? 1 : valueInt(childs$\$$i.rowSpan),
              isEmptyInt(childs$\$$i.colSpan) ? 1 : valueInt(childs$\$$i.colSpan)));
      childs.column := columnsGetCol(colAssignment, childs.cellNum);
      childs.row := rowNum;
      childs.cellNum := fold 0 .. childs$\$$$-$.cellNum + 1;
    }
    
    render := 
      canvas
      + paintLine (absX, absY, absX+tableContentWidth, absY, borderc) //top
      + paintLine (absX+tableContentWidth, absY, absX+tableContentWidth, 
      		absY+computedHeight, borderc) 
      + paintLine (absX+tableContentWidth, absY+computedHeight, absX, 
      		absY+computedHeight, borderc) 
      + paintLine (absX, absY+computedHeight, absX, absY, borderc); //left          
  }
}

interface ColI { 
  var colCount : int;
  var colNum : int;
  
  var intrinsMinWidth : int;
  var intrinsPrefWidth : int;
  var availableWidth : int;
  var computedWidth : int;
  
  var intrinsHeight : int;
  var computedHeight : int;

  var relRightX : int;
  var relX : int;
  var relY : int;
  var absX : int;
  var absY : int;
  var canvas : int;
  var render : int;
  
  var cellsReady : int;
  var tableContentHeight : int;
  
  var borderc : color;
}

class Col(shrinkToFitHeightWidth, countChilds) : ColI {
  attributes {
    input width : ?int;
    input percentWidth : ?int;
    input minWidth : ?int;
    input maxWidth : ?int;    
    input height : ?int;    
  }
  phantom {
    childs.column;
    childs.row;
    childs.cellNum;
    childs.relBotY;
    childs.relY;
    childs.absY;
  }  
  children {
    childs : [ CellI ]; //  ../rows/childs[.column == self.colNum]
  }
  actions {
    loop childs {
      intrinsMinWidth := 
        fold 
          10 
          .. 
          (isEmptyInt(childs$\$$i.colSpan) || valueInt(childs$\$$i.colSpan) == 1) ?
              max($\$$$-$.intrinsMinWidth, 10 + childs$\$$i.intrinsMinWidth)
            : $\$$$-$.intrinsMinWidth;
      intrinsPrefWidth := 
        fold 
          10
          .. 
          (isEmptyInt(childs$\$$i.colSpan) || valueInt(childs$\$$i.colSpan) == 1) ?
              max($\$$$-$.intrinsPrefWidth, 10 + childs$\$$i.intrinsPrefWidth)
            : $\$$$-$.intrinsPrefWidth;            

      intrinsHeight := fold 5 + ($\$$$\$$.numChilds == 0 ? 0 : 0) .. 
        $\$$$-$.intrinsHeight + childs$\$$i.computedHeight + 5;
      childs.availableWidth := computedWidth;

      childs.relX := 5;
      childs.absX := absX + childs$\$$i.relX;

      childs.canvas := fold render .. childs$\$$$-$.canvas;      
    }      
    
    render := 
      canvas
      + paintLine (absX, absY, absX+computedWidth, absY, borderc) //top
      + paintLine (absX+computedWidth, absY, absX+computedWidth, 
      		absY+tableContentHeight, borderc)
      + paintLine (absX+computedWidth, absY+tableContentHeight, absX, 
      		absY+tableContentHeight, borderc)
      + paintLine (absX, absY+tableContentHeight, absX, absY, borderc); //left

  }
}


interface ColsI {
  var intrinsPrefWidth : int;
  var intrinsMinWidth : int;
  
  var colCount : int;
  var availableWidth : int;
  var absX : int;
  var absY : int;
  var canvas : int;
  
  var cellsReady : int;
  var tableContentHeight : int;
  var tableContentWidth : int;
}
class Cols : ColsI {
  attributes {
     input borderc : color = #F00;
  }
  children {
    cols : [ ColI ];
  }
  actions {
    //do not know until colCount, put in dep
    loop cols {
      cols.borderc := borderc;
      cols.colCount := colCount;
      intrinsPrefWidth := 
        fold 
          10
          ..
          $\$$$-$.intrinsPrefWidth + cols$\$$i.intrinsPrefWidth;            
      intrinsMinWidth := 
        fold 
          10
          ..
          $\$$$-$.intrinsMinWidth + cols$\$$i.intrinsMinWidth;
      cols.colNum := fold 0 .. cols$\$$$-$.colNum + 1;
      cols.availableWidth := availableWidth;
      
      cols.relRightX := fold 5 .. cols$\$$$-$.relRightX + cols$\$$i.computedWidth;
      cols.relX := fold 0 .. cols$\$$i.relRightX $-$ cols$\$$i.computedWidth;
      cols.absX := absX + cols$\$$i.relX;           
      
      cols.relY := 5;
      cols.absY := absY + cols$\$$i.relY;
      cols.canvas := fold canvas .. cols$\$$$-$.canvas;                        
      cols.cellsReady := cellsReady;
      cols.tableContentHeight := tableContentHeight;
      tableContentWidth := fold 0 .. $\$$$-$.tableContentWidth + cols$\$$i.computedWidth;
    }  
  }
}


class TableBox(shrinkToFitHeightWidth, strokeBox) : Node {
  attributes {
    input borderc : color = #DDD;
    var colCount : int;
    var cellsReady : int;
  }
  children {
    rows : [ RowI ];
    columns : ColsI;
  }
  actions {
    loop rows {
      colCount := fold 0 .. max($\$$$-$.colCount, rows$\$$i.intrinsColCount);
      rows.colCount := $\$$$\$$.colCount;
      intrinsHeight := fold 10 .. $\$$$-$.intrinsHeight + rows$\$$i.computedHeight;
      rows.relBotY := fold 5 .. rows$\$$$-$.relBotY + rows$\$$i.computedHeight;
      rows.relY := fold 0 .. rows$\$$i.relBotY $-$ rows$\$$i.computedHeight;
      rows.absY := absY + rows$\$$i.relY;
      rows.absX := absX + 5;      
      rows.colAssignment := 
        fold 
          emptyColumnList(colCount) 
          .. 
          columnsAppendRow(rows$\$$$-$.colAssignment, rows$\$$i.cells, rows$\$$i.rowNum);
      rows.rowNum := fold 0 .. rows$\$$$-$.rowNum + 1;
      rows.canvas := fold render .. rows$\$$$-$.canvas;      
      cellsReady := rows$\$$$\$$.colAssignment;
      rows.tableContentWidth := columns.tableContentWidth;
    }   

    intrinsPrefWidth := columns.intrinsPrefWidth;
    intrinsMinWidth := columns.intrinsMinWidth;
    columns.colCount := colCount;
    columns.cellsReady := cellsReady ? true : true;
    columns.availableWidth := computedWidth;
    columns.absX := absX;
    columns.absY := absY;
    columns.canvas := render;
    columns.tableContentHeight := intrinsHeight $-$ 10;
  }
}
\end{lstlisting}