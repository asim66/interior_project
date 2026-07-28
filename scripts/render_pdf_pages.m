#import <AppKit/AppKit.h>
#import <PDFKit/PDFKit.h>

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc != 3) {
            fprintf(stderr, "Usage: render_pdf_pages input.pdf output-directory\n");
            return 2;
        }

        NSString *input = [NSString stringWithUTF8String:argv[1]];
        NSString *output = [NSString stringWithUTF8String:argv[2]];
        [[NSFileManager defaultManager] createDirectoryAtPath:output
                                  withIntermediateDirectories:YES
                                                   attributes:nil
                                                        error:nil];

        PDFDocument *document = [[PDFDocument alloc] initWithURL:[NSURL fileURLWithPath:input]];
        if (!document) return 1;

        CGFloat scale = 1.5;
        for (NSInteger index = 0; index < document.pageCount; index++) {
            PDFPage *page = [document pageAtIndex:index];
            NSRect bounds = [page boundsForBox:kPDFDisplayBoxMediaBox];
            NSInteger width = (NSInteger)(bounds.size.width * scale);
            NSInteger height = (NSInteger)(bounds.size.height * scale);
            NSBitmapImageRep *bitmap = [[NSBitmapImageRep alloc]
                initWithBitmapDataPlanes:nil
                              pixelsWide:width
                              pixelsHigh:height
                           bitsPerSample:8
                         samplesPerPixel:4
                                hasAlpha:YES
                                isPlanar:NO
                          colorSpaceName:NSDeviceRGBColorSpace
                             bytesPerRow:width * 4
                            bitsPerPixel:32];
            NSGraphicsContext *context = [NSGraphicsContext graphicsContextWithBitmapImageRep:bitmap];
            [NSGraphicsContext saveGraphicsState];
            [NSGraphicsContext setCurrentContext:context];
            [[NSColor whiteColor] setFill];
            NSRectFill(NSMakeRect(0, 0, width, height));
            CGContextRef cg = context.CGContext;
            CGContextScaleCTM(cg, scale, scale);
            [page drawWithBox:kPDFDisplayBoxMediaBox toContext:cg];
            [context flushGraphics];
            [NSGraphicsContext restoreGraphicsState];

            NSData *png = [bitmap representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
            NSString *filename = [NSString stringWithFormat:@"page-%02ld.png", (long)index + 1];
            [png writeToFile:[output stringByAppendingPathComponent:filename] atomically:YES];
        }
        printf("%ld\n", (long)document.pageCount);
    }
    return 0;
}
