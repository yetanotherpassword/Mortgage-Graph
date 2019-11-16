
  var options1 = {
    series: {
        shadowSize : 0
          },
    xaxis: {
        rotateTicks : 90,
        mode: "time",
        timeformat: "%Y-%m",
        tickSize: [3, 'month'],
        //tickSize: [3, "Month"],
        tickLength: 10,
        color: "black",
        axisLabel: "Date",
        axisLabelUseCanvas: true,
        axisLabelFontSizePixels: 2,
        axisLabelFontFamily: 'Verdana, Arial',
        axisLabelPadding:2
    },

    yaxes: [{
        position: "left",
        color: "black",
        axisLabel: "$ Interest/$ Principal",
        axisLabelUseCanvas: true,
        axisLabelFontSizePixels: 12,
        axisLabelFontFamily: 'Verdana, Arial',
        axisLabelPadding: 3
    }, {
        position: "right",
        color: "black",
        axisLabel: "$ Owing",
        axisLabelUseCanvas: true,
        axisLabelFontSizePixels: 12,
        axisLabelFontFamily: 'Verdana, Arial',
        axisLabelPadding: 3
    }],

    grid: {
        hoverable: true,
        borderWidth: 2,
        backgroundColor: { colors: ["#EDF5FF", "#ffffff"] }
    },
    colors:["#004078","#207800", "#613C00"]
};


$(document).ready(function () { });


//******* Stacked Horizontal Bar Chart
var data1 = [];
var data2 = [];
var owing = [];


function gd(year, month, day) {
    return new Date(year, month - 1, day).getTime();
}

var previousPoint = null, previousLabel = null;

var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

$.fn.UseTooltip = function () {
    $(this).bind("plothover", function (event, pos, item) {
        if (item) {
            if ((previousLabel != item.series.label) || (previousPoint != item.dataIndex)) {
                previousPoint = item.dataIndex;
                previousLabel = item.series.label;
                $("#tooltip").remove();

                var x = item.datapoint[0];
                var y = item.datapoint[1];

                var color = item.series.color;
                var m = new Date(x).getMonth()+1;
                var ms;
                if (m<10)
                  ms="0"+m.toString();
                else
                  ms=m.toString();
                var fy = new Date(x).getFullYear();
                var val=item.series.data[item.dataIndex][1];
                showTooltip(item.pageX,
                        item.pageY,
                        color,
                        "<strong>" + item.series.label + "</strong><br>" + fy+"-"+ms
                         + " : <strong>" + $.formatNumber(val//, { format: "#,###.##", locale: "us" }
                          ) +
                         "</strong>");
            }
        } else {
            $("#tooltip").remove();
            previousPoint = null;
        }
    });
};


    function showTooltip(x, y, color, contents) {
      $('<div id="tooltip">' + contents + '</div>').css({
        position: 'absolute',
        display: 'none',
        top: y - 40,
        left: x - 120,
        border: '2px solid ' + color,
        padding: '3px',
        'font-size': '9px',
        'border-radius': '5px',
        'background-color': '#fff',
        'font-family': 'Verdana, Arial, Helvetica, Tahoma, sans-serif',
        opacity: 0.9
      }).appendTo("body").fadeIn(200);
    }


    $.fn.UseTooltip2 = function () {
        $(this).bind("plothover", function (event, pos, item) {
            if (item) {
                if ((previousLabel != item.series.label) || (previousPoint != item.dataIndex)) {
                    previousPoint = item.dataIndex;
                    previousLabel = item.series.label;
                    $("#tooltip").remove();

                    var x = item.datapoint[0];
                    var y = item.datapoint[1];

                    var color = item.series.color;
                    var day = "Jan " + new Date(y).getDate();

                    showTooltip2(item.pageX,
                        item.pageY,
                        color,
                        "<strong>" + item.series.label + "</strong><br>" + day
                         + " : <strong>" + $.formatNumber(x, { format: "#,###", locale: "us" }) +
                         "</strong>(Count)");
                    }
            } else {
                $("#tooltip").remove();
                previousPoint = null;
            }
        });
    };


    function showTooltip2(x, y, color, contents) {
        $('<div id="tooltip">' + contents + '</div>').css({
            position: 'absolute',
            display: 'none',
            top: y - 60,
            left: x - 120,
            border: '2px solid ' + color,
            padding: '3px',
            'font-size': '9px',
            'border-radius': '5px',
            'background-color': '#fff',
            'font-family': 'Verdana, Arial, Helvetica, Tahoma, sans-serif',
            opacity: 0.9
        }).appendTo("body").fadeIn(200);
    }
    function handleClick(event){
            var principal_in=parseFloat($("#principal").val());
            var rate_in=parseFloat($("#rate").val());
            var payment_in=parseFloat($("#payment").val());
            var frequency_in=parseFloat($("#frequency").val());
            if ((principal_in>0) && (rate_in>0) && (payment_in>0) && (frequency_in>0))
                  draw(principal_in, rate_in, payment_in, frequency_in);
            else
                  alert("Error in input: Principal="+principal_in+" Rate="+rate_in+" Payment="+payment_in+" Frequency="+frequency_in);
            return false;
    }
    var dataset = [];
    var final_year=0;
    var final_month=0;

   var days=0;
   var gprincipal=0;
   var int_accum=0;

   function calc_daily_interest(principal, yearly_int_rate, year)
   {
      var days0;
      if (year % 4 == 0)
         days0=366;
       else
         days0=365;
      var a=(((yearly_int_rate/100)/days0) * principal);
      return a;
   }

   function days_in_mth(m, y)
   {
        if (m<=7)
        {
          if (m%2==1)
            return 31;
          else if (m != 2)
            return 30;
          else if (y%4==0) /* works from 2001 to 2099 */
            return 29;
          else
            return 28;
         }
         else
         {
           if (m%2==0)
             return 31;
           else
             return 30;
         }
   }


   function calc_monthly_int(mth, year, int_rate, payment_freq, pymt)
   {

      var i;
      var interest;
      var themonth;
      //var perc;
      var mth_int=0;
      var daysmth=days_in_mth(mth,year);
      var paid_this_month=0;
      if (gprincipal<= 0)
      {
         return 1;
      }
      for (i=1;i<=daysmth;i++)
      {
          days++;
          interest=calc_daily_interest(gprincipal, int_rate, year);
          gprincipal += interest;
          int_accum += interest;
          mth_int += interest;
          if (days % payment_freq == 0)
          {
             gprincipal -= pymt;
             paid_this_month += pymt;
          }
          if (gprincipal <= 0)
          {
             change=-gprincipal;
             gprincipal=0;
          }
       }
       if (mth<10)
          themonth=year.toString()+"0"+mth.toString();
       else
          themonth=year.toString()+mth.toString();

       data1.push( [  gd(year, mth, 1) , mth_int]);      // data1 is monthly interest
       data2.push( [  gd(year, mth, 1), paid_this_month-mth_int ]); // data2 is principal
       owing.push( [ gd(year, mth, 1), gprincipal]);     // owing running total
       return 0;
   }

   function draw(principal,rate,payment,frequency)
   {
             var d= new Date();
             var year=d.getFullYear();
             var mnth=d.getMonth()+1;
             var dte=year*100+mnth;

             days=0;
             int_accum=0;
             data1.length=0;
             data2.length=0;
             owing.length=0;
             gprincipal=principal;
             for (var y=year;y<=year+40;y++)
             {
                for (var i=mnth;i<=12;i++)
                {
                   if (i==12)
                     mnth=1;

                   if (calc_monthly_int(i,y,rate, frequency, payment))
                      break;
                   else
                   {
                      final_year=y;
                      final_month=i;
                   }
                }
             }
             var monthName=monthNames[(dte%100)-1];
             var yearName=Math.trunc(dte/100);
             $("#text1").text("Loan $"+principal+
                     " Int Rate "+rate+
                     "% Paying $"+payment+
                     " Every "+frequency+ " days:"+
                     " Starting "+yearName.toString()+"-"+monthName+
                     " Total Int $"+int_accum.toFixed(2).toString()+
                     " Finished "+final_year.toString()+"-"+final_month.toString());

             var line={ label: "Owing", data: owing, yaxis : 2, stack : false, lines : {    show: true, lineWidth: 2, fill: false} };
             var bars1={ label: "Interest", data: data1, color: "#0077FF", stack: true, bars: { show:true, align: "center", barWidth:24*60*60*600*30, lineWidth: 1 }};
             var bars2={ label: "Principal", data: data2, color: "#7D0096", stack: true, bars: { show:true, align: "center", barWidth:24*60*60*600*30, lineWidth: 1 }};
             dataset = [ bars1, bars2, line ];

             $('#flot-placeholder1').empty();
             $.plot($("#flot-placeholder1"), dataset, options1);
             $("#flot-placeholder1").UseTooltip();

      }
