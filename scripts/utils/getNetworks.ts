import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

const filePath = path.resolve(__dirname, "../../hardhat.config.ts");
const source = fs.readFileSync(filePath, "utf8");

const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);

let configObject: ts.ObjectLiteralExpression | undefined;

const visit = (node: ts.Node): void => {
    if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
            if (
                ts.isIdentifier(decl.name) &&
                decl.name.text === "config" &&
                decl.initializer &&
                ts.isObjectLiteralExpression(decl.initializer)
            ) {
                configObject = decl.initializer;
            }
        }
    }
    ts.forEachChild(node, visit);
};

visit(sf);

const getPropName = ({ propName }: { propName?: ts.PropertyName } = {}): string | undefined => {
    if (!propName) {
        return undefined;
    }
    if (ts.isIdentifier(propName)) {
        return propName.text;
    }
    if (ts.isStringLiteral(propName)) {
        return propName.text;
    }
    if (ts.isComputedPropertyName(propName) && ts.isStringLiteral(propName.expression)) {
        return propName.expression.text;
    }

    return undefined;
};

const getElementName = (el: ts.ObjectLiteralElementLike): string | undefined => {
    if (
        ts.isPropertyAssignment(el) ||
        ts.isShorthandPropertyAssignment(el) ||
        ts.isMethodDeclaration(el) ||
        ts.isGetAccessorDeclaration(el) ||
        ts.isSetAccessorDeclaration(el)
    ) {
        const name = el.name as ts.PropertyName | undefined;

        return getPropName({ propName: name });
    }

    return undefined;
};

const networks: string[] = [];

if (configObject) {
    for (const prop of configObject.properties) {
        if (ts.isPropertyAssignment(prop)) {
            const { name, initializer } = prop;
            const key = getPropName({ propName: name });

            if (key === "networks" && ts.isObjectLiteralExpression(initializer)) {
                const obj = initializer;

                for (const element of obj.properties) {
                    const nkey = getElementName(element);

                    if (nkey) {
                        networks.push(nkey);
                    }
                }
            }
        }
    }
}

process.stdout.write(networks.map((n) => n.toLowerCase()).join(" "));
