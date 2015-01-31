require 'tabula'
require 'fileutils'

pdf_file_path = "raw_data/pdf/"

def traversePath(path)
  files = Dir::entries(path)
  files[2..files.length].each do |file|
    if File.directory?(path + file)
      puts "directory: " + file
      traversePath(path + file + '/')
    elsif File.file?(path + file) && file.include?(".pdf") && !file.include?("hb_eagle")
      convertPDF(path, file)
    end
  end
end

def convertPDF(path, file)
  csv_path = path.gsub("pdf", "csv")
  out_file_name = file.gsub(".pdf", ".csv")
  FileUtils.mkdir_p csv_path

  puts "convertPDF input: " + path + file
  puts "convertPDF output: " + csv_path + out_file_name

  out = open(csv_path + out_file_name, 'w')

  extractor = Tabula::Extraction::ObjectExtractor.new(path + file, :all)
  extractor.extract.each_with_index do |pdf_page, page_index|
    puts "extracting file: " + file
    out << pdf_page.get_table.to_csv
  end
  extractor.close!
  puts "writing file: " + out_file_name
  out.close
end

traversePath(pdf_file_path)


# pdf_file_path = "raw_data/pdf/"
# files = Dir::entries(pdf_file_path)
# out_file_path = "raw_data/csv/"

# files[2..files.length].each do |pdf_file_name|

#   out_file_name = pdf_file_name.gsub(".pdf", ".csv")
#   puts "file: " + pdf_file_path + pdf_file_name
#   puts "output file: " + out_file_path + out_file_name
#   out = open(out_file_path + out_file_name, 'w')

#   extractor = Tabula::Extraction::ObjectExtractor.new(pdf_file_path + pdf_file_name, :all)
#   extractor.extract.each_with_index do |pdf_page, page_index|
#     puts "extracting file: " + pdf_file_name
#     out << pdf_page.get_table.to_csv
#   end
#   extractor.close!
#   puts "writing file: " + out_file_name
#   out.close
# end


