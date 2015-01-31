:cop: NYPD CompStat Parser :police_car:
====================

This works in two parts:

1. A ruby program to parse the PDFs to CSV files using Tabula PDF.
2. A node program to parse the CSVs to JSON files.


The parsers expect that the data resides in two directories:

1. raw_data/pdf  for the pdf files (these can be in any number of sub directories)
2. raw_data/csv  for the csv files (these can be in any number of sub directories)


The raw PDFs are from ajschumacher's repository at https://github.com/ajschumacher/nypd
