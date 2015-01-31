var fs = require('fs'),
  _ = require('highland'),
  path = require('path');

var readFile = _.wrapCallback(fs.readFile);
var csvPath = 'raw_data/csv/';
var outputPath = 'raw_data/json/';

var validData = function(val) {
  return (!isNaN(Number(val)));
};

var parseCrime = function(crime, lineData) {
  // console.log(lineData);
  return {
    crime: crime.trim(),
    wtd_curr_yr: Number(lineData[0]),
    wtd_prev_yr: Number(lineData[1]),
    wtd_pct_change: (validData(lineData[2])) ? Number(lineData[2]) : null,
    twentyeight_day_curr_yr: Number(lineData[3]),
    twentyeight_day_prev_yr: Number(lineData[4]),
    twentyeight_day_pct_change: (validData(lineData[5])) ? Number(lineData[5]) : null,
    ytd_curr_yr: Number(lineData[6]),
    ytd_prev_yr: Number(lineData[7]),
    ytd_pct_change: (validData(lineData[8])) ? Number(lineData[8]) : null,
    two_year_pct_change: (validData(lineData[9])) ? Number(lineData[9]) : null,
    six_year_pct_change: (validData(lineData[10])) ? Number(lineData[10]) : null,
    twentytwo_year_pct_change: (validData(lineData[11])) ? Number(lineData[11]) : null
  };
};

var parseHistorical = function(crime, lineData, keys) {
  var historical = {};

  keys.forEach(function(key, i) {
    historical[key] = (validData(lineData[i])) ? Number(lineData[i]) : null;
  });

  historical.crime = crime.trim();
  return historical;
};

var getFormat1 = function(line) {
  var lineSplit = line.split('",');
  var re = /[0-9]/, re2 = /"/g, re3 = /[a-z] [0-9]/i;
  var idx = re3.exec(lineSplit[0]);
  var initialPart, firstVal;
  if(idx) {
    initialPart = lineSplit[0].substr(0, idx.index + 2).replace(re2,'');
    firstVal = lineSplit[0].substr(idx.index + 2).split('",')[0].trim();
  } else {
    idx = re.exec(lineSplit[0]);
    if(idx) {
      initialPart = lineSplit[0].substr(0, idx.index).replace(re2,'');
      firstVal = lineSplit[0].substr(idx.index).replace(re2, '').trim();
    } else {
      throw new Error('getFormat1 input error');
    }
  }

  return [initialPart, firstVal + ' ' + lineSplit[1].replace(re2,'')];
};

var getFormat2 = function(line) {
  var splitIdx = line.indexOf(',"');
  return [line.substr(0, splitIdx), line.substr(splitIdx).replace(/,/g,'').replace(/"/g, '')];
};

var getFormat3 = function(line) {
  var re = /[a-z] [0-9]/i;
  var idx = re.exec(line).index + 2;
  return [line.substr(0, idx), line.substr(idx).replace(',', '')];
};

var getData = function(lines, type, keys) {
  var parseFunction = (type === 'crime') ? parseCrime : parseHistorical;
  var re = /[a-z] [0-9]/i;

  return lines.map(function(line) {
    if(line.indexOf('Historical') === -1) {
      var lineParts, additionalData;
      if(line.indexOf('",') !== -1) {
        lineParts = getFormat1(line);
      } else if(line.indexOf(',"') !== -1) {
        lineParts = getFormat2(line);
      } else if (re.exec(line)) {
        lineParts = getFormat3(line);
      } else {
        lineParts = line.split(',');
      }

      var re1 = /,/g;
      var lineData = lineParts[1].replace(re1,'').split(' ');
      return parseFunction(lineParts[0], lineData, keys);
    }
  });
};

var getHistoricalKeys = function(lines) {
  var pctCount = 0;
  var currPct = 0;
  var pctStart;
  var yr1, yr2;
  return lines[0].split(' ')
  .filter(function(item) { return (item !== ''); })
  .map(function(item, idx) {
    if(item.indexOf('%') !== -1) {
      pctCount++;
      if(!pctStart) { pctStart = idx; }
    }
    return item.replace(',','').replace('\'','').replace('\r','');
  })
  .reduce(function(acc, curr, idx, arr) {
    if(idx < pctStart) {
      acc.push('yr_' + curr);
      return acc;
    }

    if(idx >= pctStart && idx < pctStart + pctCount) {
      yr1 = arr[idx + pctCount + (currPct * 2)];
      yr2 = arr[idx + pctCount + 2 + (currPct * 2)];
      acc.push('pct_change_' + yr1 + 'vs' + yr2);
      currPct++;
      return acc;
    }

    return acc;
  }, []);
};

//dry these two bounds functions.
var getDataBounds = function(lines) {
  var start, end;

  lines.every(function(line, i) {
    if(line.indexOf('Murder') !== -1) {
      start = i;
      return false;
    }
    return true;
  });

  lines.every(function(line, i) {
    if(line.indexOf('Historical Perspective') !== -1) {
      end = i;
      return false;
    }
    return true;
  });

  return [start, end];
};
var getHistBounds = function(lines) {
  var start, end;

  lines.every(function(line, i) {
    if(line.indexOf('Historical Perspective') !== -1) {
      start = i + 3;
      return false;
    }
    return true;
  });

  lines.every(function(line, i) {
    if(line.indexOf('The above CompStat') !== -1) {
      end = i;
      return false;
    }
    return true;
  });

  return [start, end];
};

var parseLines = function(lines) {
  var splitLine, fileData = {};

  splitLine = lines[2].split(',');
  fileData.mayor = splitLine[0].trim();
  fileData.commissioner = splitLine[1].trim();

  splitLine = lines[4].split(',');
  fileData.volume = Number(splitLine[0].split('Number')[0].replace('Volume', '').trim());
  fileData.number = Number(splitLine[0].split('Number')[1].replace('Number', '').trim());
  fileData.precinct = splitLine[1].replace('CompStat', '').replace('Precinct', '').trim();

  splitLine = lines[5].split('Week')[1].split('Through');
  fileData.startDate = new Date(splitLine[0].trim());
  fileData.endDate = new Date(splitLine[1].trim());

  var dataBounds = getDataBounds(lines);
  var histBounds = getHistBounds(lines);

  fileData.crimes = getData(lines.slice(dataBounds[0], dataBounds[1]), 'crime');

  var historicalKeys = getHistoricalKeys(lines.slice(histBounds[0] - 1, histBounds[0] + 1));
  fileData.historical = getData(lines.slice(histBounds[0], histBounds[1]), 'historical', historicalKeys);

  return fileData;
};

var getFileDate = function(d) {
  return (d.getMonth() + 1) + ':' + d.getDate() + ':' + d.getFullYear();
};

var buildFilename = function(startDate, endDate, precinct) {
  return 'cs_' + precinct.replace(/  /g,' ').replace(/ /g,'_') + '_' + getFileDate(startDate) + '_' + getFileDate(endDate) + '.json';
};

var parseContents = function(fileContents) {
  var re = /\r/g;
  return parseLines(fileContents.toString().replace(re,'').split('\n'));
};

var setFile = function (fileData) {
  var fileName = buildFilename(fileData.startDate, fileData.endDate, fileData.precinct);
  return {
    data: fileData,
    fileName: fileName
  };
};

var saveFile = function(file) {
  fs.writeFile(outputPath + file.fileName, JSON.stringify(file.data), function(err, result) {
    if(err) {
      console.error('error writing file:', outputPath + file.fileName, err);
    }
    console.log('file saved:', outputPath + file.fileName);
  });
};

var parseFiles = function(csvPaths) {
  _(csvPaths).map(readFile)
  .series()
  .map(parseContents)
  .map(setFile)
  .errors(function(err, rethrow) {
    console.log(err);
  })
  .each(saveFile);
};

var getCsvFiles = function(path) {
  var csvFiles = [];
  var files = fs.readdirSync(path);
  files.forEach(function(file) {
    if(fs.lstatSync(path + file).isDirectory()) {
      csvFiles = csvFiles.concat(getCsvFiles(path + file + '/'));
    } else if(file.indexOf('pct') !== -1) {
      csvFiles.push(path + file);
    }
  });
  return csvFiles;
};

parseFiles(getCsvFiles(csvPath));
