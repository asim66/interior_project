#import <AppKit/AppKit.h>

int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc != 3) {
            fprintf(stderr, "Usage: make_contact_sheets pages-directory output-directory\n");
            return 2;
        }
        NSString *input = [NSString stringWithUTF8String:argv[1]];
        NSString *output = [NSString stringWithUTF8String:argv[2]];
        [[NSFileManager defaultManager] createDirectoryAtPath:output
                                  withIntermediateDirectories:YES
                                                   attributes:nil
                                                        error:nil];
        NSArray<NSString *> *files = [[[NSFileManager defaultManager] contentsOfDirectoryAtPath:input error:nil]
            filteredArrayUsingPredicate:[NSPredicate predicateWithFormat:@"SELF ENDSWITH '.png'"]];
        files = [files sortedArrayUsingSelector:@selector(localizedStandardCompare:)];

        CGFloat pageWidth = 459;
        CGFloat pageHeight = 594;
        CGFloat gap = 18;
        CGFloat labelHeight = 24;
        NSInteger perSheet = 4;
        NSInteger sheetCount = (files.count + perSheet - 1) / perSheet;

        for (NSInteger sheet = 0; sheet < sheetCount; sheet++) {
            CGFloat width = pageWidth * 2 + gap * 3;
            CGFloat height = (pageHeight + labelHeight) * 2 + gap * 3;
            NSImage *canvas = [[NSImage alloc] initWithSize:NSMakeSize(width, height)];
            [canvas lockFocus];
            [[NSColor colorWithWhite:0.86 alpha:1] setFill];
            NSRectFill(NSMakeRect(0, 0, width, height));

            for (NSInteger slot = 0; slot < perSheet; slot++) {
                NSInteger index = sheet * perSheet + slot;
                if (index >= files.count) break;
                NSImage *image = [[NSImage alloc] initWithContentsOfFile:[input stringByAppendingPathComponent:files[index]]];
                NSInteger col = slot % 2;
                NSInteger row = slot / 2;
                CGFloat x = gap + col * (pageWidth + gap);
                CGFloat y = height - gap - (row + 1) * (pageHeight + labelHeight);
                [image drawInRect:NSMakeRect(x, y + labelHeight, pageWidth, pageHeight)
                         fromRect:NSZeroRect
                        operation:NSCompositingOperationCopy
                         fraction:1];
                NSString *label = [NSString stringWithFormat:@"Page %ld", (long)index + 1];
                NSDictionary *attributes = @{
                    NSFontAttributeName: [NSFont boldSystemFontOfSize:13],
                    NSForegroundColorAttributeName: [NSColor blackColor]
                };
                [label drawAtPoint:NSMakePoint(x, y + 4) withAttributes:attributes];
            }
            [canvas unlockFocus];

            NSBitmapImageRep *rep = [[NSBitmapImageRep alloc] initWithData:[canvas TIFFRepresentation]];
            NSData *png = [rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
            NSString *filename = [NSString stringWithFormat:@"sheet-%02ld.png", (long)sheet + 1];
            [png writeToFile:[output stringByAppendingPathComponent:filename] atomically:YES];
        }
        printf("%ld\n", (long)sheetCount);
    }
    return 0;
}
