import * as React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Typography } from '@/constants/Typography';
import { Item } from '@/components/Item';
import { ItemGroup } from '@/components/ItemGroup';

const TextSample = ({ title, style, text = "The quick brown fox jumps over the lazy dog" }: { title: string; style: any; text?: string }) => (
    <View style={styles.sampleContainer}>
        <Text style={styles.sampleTitle}>{title}</Text>
        <Text style={[{ fontSize: 16 }, style]}>{text}</Text>
    </View>
);

const CodeSample = ({ title, style }: { title: string; style: any }) => (
    <View style={styles.sampleContainer}>
        <Text style={styles.sampleTitle}>{title}</Text>
        <Text style={[{ fontSize: 14 }, style]}>
            {`const greeting = "Hello, World!";\nconsole.log(greeting);`}
        </Text>
    </View>
);

export default function TypographyScreen() {
    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                {/* Inter (Default) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Inter (Default)</Text>

                    <TextSample
                        title="Regular (400)"
                        style={Typography.default()}
                    />

                    <TextSample
                        title="Medium (500)"
                        style={Typography.default('medium')}
                    />
                </View>

                {/* JetBrains Mono */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>JetBrains Mono</Text>

                    <CodeSample
                        title="Regular (400)"
                        style={Typography.mono()}
                    />

                    <CodeSample
                        title="Medium (500)"
                        style={Typography.mono('medium')}
                    />
                </View>

                {/* Space Grotesk (Heading) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Space Grotesk (Heading)</Text>

                    <TextSample
                        title="Bold (700) - Headings & Branding"
                        style={{ fontSize: 28, ...Typography.heading() }}
                        text="Idle"
                    />
                    <Text style={styles.note}>
                        Note: This font is used for headings and branding
                    </Text>
                </View>

                {/* Font Sizes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Font Size Scale</Text>
                    
                    {[12, 14, 16, 18, 20, 24, 28, 32, 36].map(size => (
                        <View key={size} style={styles.fontSizeItem}>
                            <Text style={{ fontSize: size, ...Typography.default() }}>
                                {size}px - The quick brown fox
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Text in Components */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Typography in Components</Text>
                    
                    <ItemGroup title="List Item Typography">
                        <Item 
                            title="Default Title (17px regular)"
                            subtitle="Default Subtitle (15px regular, #8E8E93)"
                            detail="Detail"
                        />
                        <Item 
                            title="With Custom Title Style"
                            titleStyle={{ ...Typography.default('medium') }}
                            subtitle="Using medium for title"
                        />
                        <Item 
                            title="Monospace Detail"
                            detail="v1.0.0"
                            detailStyle={{ ...Typography.mono() }}
                        />
                    </ItemGroup>
                </View>

                {/* Usage Examples */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Usage Examples</Text>
                    
                    <View style={styles.codeBlock}>
                        <Text style={{ ...Typography.mono(), fontSize: 12 }}>
{`// Default typography (Inter)
<Text style={{ fontSize: 16, ...Typography.default() }}>Regular</Text>
<Text style={{ fontSize: 16, ...Typography.default('medium') }}>Medium</Text>

// Monospace typography (JetBrains Mono)
<Text style={{ fontSize: 14, ...Typography.mono() }}>Code</Text>

// Heading typography (Space Grotesk)
<Text style={{ fontSize: 28, ...Typography.heading() }}>Heading</Text>`}
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    content: {
        padding: 16,
    },
    sampleContainer: {
        marginBottom: 24,
    },
    sampleTitle: {
        fontSize: 14,
        color: 'rgba(0,0,0,0.5)',
        marginBottom: 4,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
    },
    note: {
        fontSize: 14,
        color: 'rgba(0,0,0,0.5)',
        marginTop: 8,
    },
    fontSizeItem: {
        marginBottom: 12,
    },
    codeBlock: {
        backgroundColor: '#f0f0f0',
        padding: 16,
        borderRadius: 8,
    },
});