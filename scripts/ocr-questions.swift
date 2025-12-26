#!/usr/bin/env swift
import Foundation
import Vision
import AppKit

struct OCRResult: Codable {
    var file: String
    var text: String
}

func ocrImage(at url: URL) throws -> String {
    guard let image = NSImage(contentsOf: url) else {
        throw NSError(domain: "ocr", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to load image: \(url.path)"])
    }
    var rect = CGRect(origin: .zero, size: image.size)
    guard let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
        throw NSError(domain: "ocr", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to get CGImage: \(url.path)"])
    }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.minimumTextHeight = 0.01

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try handler.perform([request])

    let observations = request.results ?? []
    let lines = observations.compactMap { $0.topCandidates(1).first?.string }
    return lines.joined(separator: "\n")
}

let directoryPath = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "questions"
let directoryURL = URL(fileURLWithPath: directoryPath, isDirectory: true)

let fm = FileManager.default
let urls = try fm.contentsOfDirectory(at: directoryURL, includingPropertiesForKeys: nil)
    .filter { $0.pathExtension.lowercased() == "png" }
    .sorted { $0.lastPathComponent.localizedStandardCompare($1.lastPathComponent) == .orderedAscending }

var results: [OCRResult] = []

for url in urls {
    do {
        let text = try ocrImage(at: url)
        results.append(OCRResult(file: url.lastPathComponent, text: text))
    } catch {
        results.append(OCRResult(file: url.lastPathComponent, text: "[OCR ERROR] \(error.localizedDescription)"))
    }
}

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
let data = try encoder.encode(results)
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write(Data("\n".utf8))
