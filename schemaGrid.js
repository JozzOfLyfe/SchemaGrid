//jQuery Packager
// pass in schema and data
(function($) {

  $.fn.schemaGrid = function(schema, data) {
    // Assign functions to pager buttons
    var lastsel2 = 0;
    var ajv = new Ajv();
    var currentData = $.extend([], data)
    var currentSchema = $.extend(null, schema);
    
    var addRow = function() {
    	var defaultValues = {"string":"undef", "integer": 0, "float": 0, "boolean":true}
      $(this).jqGrid('addRowData', $.jgrid.randId(), {
        name: 'Undefined',
        number: 0,
        reapplied: true,
        participants: 'US'
      }, 'after', lastsel2);
      matchIdWithIndex(this);

    }

    var deleteRows = function() {
      var rowId =
        $(this).jqGrid('getGridParam', 'selarrrow');
      for (var i = rowId.length - 1; i >= 0; i--) {
        deleteRowWithID(rowId[i], this);
      }
      matchIdWithIndex(this);
    }

    var deleteRowWithID = function(id, _this) {
      var p = $(_this).jqGrid("getGridParam")
        // delete the row
      $(_this).jqGrid('delRowData', id); //delete row with id
      if (id == lastsel2)
        lastsel2 = 0;
      // editing row way deleted from the grid
      p.savedRow = [];
      delete p.iRow;
      delete p.iCol;
    }

    //deselects all rows
    // different from resetSelection in that it actually saves
    //   the cell after clicking on another row
    var deselectAllSelected = function(_this) {
      $.each($(_this).getDataIDs(), function(_, rowid) {
        if (isSelected(rowid, _this))
          $(_this).jqGrid('setSelection', rowid, false);
      });
    }

    // Matches index with ID such that the cellEdit doesn't break
    var matchIdWithIndex = function(_this) {
      $.each($(_this).getDataIDs(), function(_, rowid) {
        var $rowid = $("#" + rowid)
        console.log($rowid[0].rowIndex)
        $rowid.attr("id", $(_this).jqGrid('getInd', rowid));
      });
    }

    // Checks if the row with rowid is selected
    var isSelected = function(rowid, _this) {
      return $.inArray(rowid, ($(_this).jqGrid('getGridParam', 'selarrrow'))) !== -1;
    }

    //update row so that the cell type matches column type
    var update = function(row) {
        for (var key in row) {
          if (localSchema.properties[key].type === "integer") {
            if (row[key] % 1 === 0)
              row[key] = parseInt(row[key], 10);
          } else if (localSchema.properties[key].type === "float") {
            if (Number(row[key]) === row[key])
              row[key] = parseFloat(row[key])
          } else if (localSchema.properties[key].type === "boolean")
            row[key] = row[key] === "Yes";
        }
        return row;
      }
      //creates the column model from schema
    var colModelCreate = [];
    var editTypeMap = {
      "string": "text",
      "integer": "text",
      "boolean": "checkbox"
    };

    $.each(currentSchema.properties, function(i, item) {
      colModelCreate.push({
        name: i,
        width: 40,
        editable: !item.readonly,
        edittype: editTypeMap[item.type],
        formatter: editTypeMap[item.type],
        editrules: {
          //custom: true,
          //custom_func: validation
        }
      });
    });
    this.jqGrid({

      //url: '/jqgrid/event/getall',
      datatype: 'clientSide',
      data: currentData,
      mtype: 'POST',
      editurl: 'clientArray',
      colModel: colModelCreate,
      rowNum: 10,
      rowList: [],
      autowidth: false,
      width: 300,
      //rownumbers: true,
      pager: '#pager',
      sortname: 'id',
      viewrecords: true,
      sortorder: "asc",
      caption: "Events",
      emptyrecords: "Empty records",
      loadonce: false,
      pgbuttons: false,
      pgtext: null,
      viewrecords: false,
      multiselect: true,
      cellEdit: true,
      cellsubmit: 'clientArray',

      //shift select, beforeSelectRow
      beforeSelectRow: function(rowid, e) {

        //basic selection
        if (!e.altKey && !e.shiftKey) {
          //check if picked the same row
          if (rowid !== lastsel2 || $(this).jqGrid('getGridParam', 'selarrrow').length > 1) {
            deselectAllSelected(this);
          } else
            return false;
          //shift selection
        } else if (lastsel2 && e.shiftKey) {
          var initialRowSelect = $(this).jqGrid('getGridParam', 'selrow');
          deselectAllSelected(this);

          if (rowid !== lastsel2) {
            var CurrentSelectIndex = $(this).jqGrid('getInd', rowid);
            var InitialSelectIndex = $(this).jqGrid('getInd', initialRowSelect);
            var startID = rowid;
            var endID = initialRowSelect;
            if (CurrentSelectIndex > InitialSelectIndex) {
              startID = initialRowSelect;
              endID = rowid;
            }

            var shouldSelectRow = false;
            var _this = this;
            $.each($("#" + this.id).getDataIDs(), function(_, id) {
              if ((shouldSelectRow = id == startID || shouldSelectRow) && (id != rowid)) {
                $(_this).jqGrid('setSelection', id, false);
              }
              return id != endID;
            });
            lastsel2 = rowid;
          } else {
            $(this).jqGrid('setSelection', rowid, false);
            return false;
          }
          //selection using ctrl
        } else if (e.altKey && isSelected(rowid)) {
          return false;
        }
        return true;
      },

      onSelectRow: function(rowid, status) {
        lastsel2 = rowid;
      },

      afterSaveCell: function(rowid, cellname, value, iRow, iCol) {
        var row = ($(this)).jqGrid('getRowData', rowid);
        row = update(row);

        var valid = ajv.validate(localSchema, row);
        if (!valid) {
          console.log(ajv.errors[0].message + ' ' + iRow + ' ' + iCol);
          $(this).jqGrid('restoreCell', iRow, iCol);
        } else {
          ($(this)).jqGrid('setRowData', rowid, row)
        }
      },
    });

    $(this).jqGrid('navGrid', '#pager', {
      view: true,
      del: false,
      add: false,
      edit: false,
      search: false,
      refresh: false
    });
    $(this).jqGrid('hideCol', 'cb');
    //$(this).no_legacy_api = false;

    $(this).navButtonAdd('#pager', {
      caption: "Add",
      buttonicon: "ui-icon-plus",
      onClickButton: addRow,
      position: "last",
      title: "",
      cursor: "pointer"
    });

    $(this).navButtonAdd('#pager', {
      caption: "Delete",
      buttonicon: "ui-icon-trash",
      onClickButton: deleteRows,
      position: "last",
      title: "",
      cursor: "pointer"
    });
  }
}(jQuery));
