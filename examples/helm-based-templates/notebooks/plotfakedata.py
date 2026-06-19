import csv
import matplotlib.pyplot as plt
x=[]
y=[]
with open("fakedata.csv","r") as d:
    plottable=csv.reader(d,delimiter=",")
    for row in plottable:
        x.append(int(row[0]))
        y.append(int(row[1]))
    plt.plot(x,y)
    plt.savefig("/tmp/fakedata.png")